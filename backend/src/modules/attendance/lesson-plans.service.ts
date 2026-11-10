import type { Prisma } from '@generated/prisma/client.ts'
import type { LessonPlan, LessonPlanSession } from '@shigjetademy/shared/lesson-plans'
import { getWeekday } from '@shigjetademy/shared/calendar-day'
import { toClock, toDate, toDay, toTime } from '@lib/calendar-day.ts'
import { getOrganizationNow } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { findLecturerId } from './lecturer-lookup.ts'
import { findRescheduleOf, getSession, getSessions, getTeachingLecturerId } from './lesson-calendar.ts'
import type { LessonGroup } from './lesson-calendar.ts'
import { lessonGroupSelectAll, lessonGroupSelectOn, toLessonGroup } from './lesson-group.ts'

/** Who is asking; the route only lets through lecturers and admins with MANAGE_COURSES */
export type LessonPlanViewer = {
  userId: string
  /** The owner, or a school admin with MANAGE_COURSES */
  isManager: boolean
}

type Db = Prisma.TransactionClient

/** A manager reaches every plan; a lecturer only the one of a session they teach that day, substitute or permanent. Unlike attendance, there is no reader-only role: the permanent lecturer of a covered day has no access to that day's plan */
type LessonPlanAccess = 'MANAGER' | 'TEACHER'

type GetAccessParams = {
  db: Db
  organizationId: string
  viewer: LessonPlanViewer
  group: LessonGroup
  date: string
}

const getAccess = async ({ db, organizationId, viewer, group, date }: GetAccessParams): Promise<LessonPlanAccess> => {
  if (viewer.isManager) return 'MANAGER'
  const lecturerId = await findLecturerId({ db, organizationId, userId: viewer.userId })
  if (lecturerId && getTeachingLecturerId({ group, day: date }) === lecturerId) return 'TEACHER'
  throw new HttpError(403, 'You don’t teach this group on this day.')
}

/** One session's plan: the group, the day and the start time */
type PlanScope = {
  organizationId: string
  viewer: LessonPlanViewer
  groupId: string
  date: string
  startTime: string
}

type LoadPlanParams = PlanScope & {
  db: Db
}

/** The organization's group with its session that day at that start, who may use it, whether covered may be set now, and any plan already on record; 404, 403 and 409 in that order */
const loadPlan = async ({ db, organizationId, viewer, groupId, date, startTime }: LoadPlanParams) => {
  const group = await db.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: lessonGroupSelectOn([date]) })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  const lessonGroup = toLessonGroup(group)
  await getAccess({ db, organizationId, viewer, group: lessonGroup, date })
  const session = getSession({ group: lessonGroup, day: date, startTime })
  if (!session) {
    throw new HttpError(409, `This group has no lesson on this day at ${startTime}.`)
  }
  const now = await getOrganizationNow({ db, organizationId })
  const hasStarted = `${now.day} ${now.clock}` >= `${date} ${session.start_time}`
  const row = await db.lessonPlan.findUnique({
    where: { group_id_date_start_time: { group_id: group.id, date: toDate(date), start_time: toTime(startTime) } },
    select: { topic: true, covered: true },
  })
  return { group, session, hasStarted, row }
}

type LoadedPlan = Awaited<ReturnType<typeof loadPlan>>

const toPlanJson = ({ group, session, row, hasStarted }: LoadedPlan, date: string): LessonPlan => ({
  group_id: group.id,
  date,
  start_time: session.start_time,
  end_time: session.end_time,
  rescheduled_from: session.rescheduled_from,
  topic: row?.topic ?? null,
  covered: row?.covered ?? null,
  can_edit_covered: hasStarted,
})

/** Nobody may set covered before the session starts; there is no upper bound, unlike attendance's lock */
const checkCanEditCovered = ({ hasStarted, session }: LoadedPlan) => {
  if (hasStarted) return
  throw new HttpError(409, `You can record what was covered from ${session.start_time} on.`)
}

type UpsertPlanParams = {
  tx: Db
  groupId: string
  date: string
  startTime: string
  updatedById: string
  data: { topic: string | null } | { covered: string | null }
}

/** One row per session, so writing a field again just overwrites it */
const upsertPlan = ({ tx, groupId, date, startTime, updatedById, data }: UpsertPlanParams) => {
  const key = { group_id: groupId, date: toDate(date), start_time: toTime(startTime) }
  return tx.lessonPlan.upsert({
    where: { group_id_date_start_time: key },
    create: { ...key, ...data, updated_by_id: updatedById },
    update: { ...data, updated_by_id: updatedById },
    select: { topic: true, covered: true },
  })
}

type ResolvedPlanDisplay = {
  date: string
  start_time: string
  end_time: string
  rescheduled_from: LessonPlan['rescheduled_from']
  topic: string | null
  covered: string | null
}

type ResolvePlanDisplayParams = {
  lessonGroup: LessonGroup
  row: { date: string; start_time: string; topic: string | null; covered: string | null }
}

/**
 * Where a stored plan shows: under the session it moved to, when a reschedule carries it there; otherwise under its own day,
 * with the live session's end time when there still is one, or a zero-length slot that keeps it reachable when there isn't
 */
const resolvePlanDisplay = ({ lessonGroup, row }: ResolvePlanDisplayParams): ResolvedPlanDisplay => {
  const moved = findRescheduleOf({ group: lessonGroup, day: row.date, startTime: row.start_time })
  if (moved) {
    return { date: moved.new_date, start_time: moved.new_start_time, end_time: moved.new_end_time, rescheduled_from: { date: row.date, start_time: row.start_time }, topic: row.topic, covered: row.covered }
  }
  const session = getSession({ group: lessonGroup, day: row.date, startTime: row.start_time })
  if (session) {
    return { date: row.date, start_time: row.start_time, end_time: session.end_time, rescheduled_from: session.rescheduled_from, topic: row.topic, covered: row.covered }
  }
  return { date: row.date, start_time: row.start_time, end_time: row.start_time, rescheduled_from: null, topic: row.topic, covered: row.covered }
}

type ListSessionsParams = {
  organizationId: string
  viewer: LessonPlanViewer
  date: string
}

type ListGroupPlansParams = {
  organizationId: string
  viewer: LessonPlanViewer
  groupId: string
}

export const LessonPlanService = {
  // Managers see every session of an active group that day; a lecturer only those they teach that day, so a covered day goes to the substitute
  listSessions: async ({ organizationId, viewer, date }: ListSessionsParams): Promise<LessonPlanSession[]> => {
    const lecturerId = viewer.isManager ? null : await findLecturerId({ db: prisma, organizationId, userId: viewer.userId })
    if (!viewer.isManager && !lecturerId) return []
    const teachingFilter = lecturerId ? { OR: [{ lecturer_assignments: { some: { lecturer_id: lecturerId } } }, { substitutions: { some: { lecturer_id: lecturerId } } }] } : {}
    const mayMeetFilter = { OR: [{ meetings: { some: { weekday: getWeekday(date) } } }, { reschedules: { some: { new_date: toDate(date), cancelled_at: null } } }] }
    const groups = await prisma.group.findMany({ where: { organization_id: organizationId, status: 'ACTIVE', AND: [mayMeetFilter, teachingFilter] }, select: lessonGroupSelectOn([date]) })
    return groups
      .flatMap((group) => {
        const lessonGroup = toLessonGroup(group)
        if (lecturerId && getTeachingLecturerId({ group: lessonGroup, day: date }) !== lecturerId) return []
        return getSessions({ group: lessonGroup, day: date }).map((session) => ({
          group_id: group.id,
          name: group.name,
          course: group.course.name,
          location: group.room?.name ?? null,
          start_time: session.start_time,
          end_time: session.end_time,
          rescheduled_from: session.rescheduled_from,
        }))
      })
      .toSorted((a, b) => a.start_time.localeCompare(b.start_time) || a.name.localeCompare(b.name))
  },

  // Every plan ever written for the group, under whichever day its session now falls on, that this viewer may read
  listGroupPlans: async ({ organizationId, viewer, groupId }: ListGroupPlansParams): Promise<LessonPlan[]> => {
    const group = await prisma.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: lessonGroupSelectAll() })
    if (!group) {
      throw new HttpError(404, 'Group not found')
    }
    const lecturerId = viewer.isManager ? null : await findLecturerId({ db: prisma, organizationId, userId: viewer.userId })
    if (!viewer.isManager) {
      const teaches = lecturerId !== null && (group.lecturer_assignments.some((row) => row.lecturer_id === lecturerId) || group.substitutions.some((row) => row.lecturer_id === lecturerId))
      if (!teaches) {
        throw new HttpError(403, 'You don’t teach this group.')
      }
    }
    const rows = await prisma.lessonPlan.findMany({ where: { group_id: groupId }, select: { date: true, start_time: true, topic: true, covered: true } })
    if (rows.length === 0) return []
    const lessonGroup = toLessonGroup(group)
    const now = await getOrganizationNow({ db: prisma, organizationId })
    return rows
      .map((row) => resolvePlanDisplay({ lessonGroup, row: { date: toDay(row.date), start_time: toClock(row.start_time), topic: row.topic, covered: row.covered } }))
      .filter((display) => viewer.isManager || (lecturerId !== null && getTeachingLecturerId({ group: lessonGroup, day: display.date }) === lecturerId))
      .map((display) => ({
        group_id: group.id,
        date: display.date,
        start_time: display.start_time,
        end_time: display.end_time,
        rescheduled_from: display.rescheduled_from,
        topic: display.topic,
        covered: display.covered,
        can_edit_covered: `${now.day} ${now.clock}` >= `${display.date} ${display.start_time}`,
      }))
      .toSorted((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  },

  getPlan: async (scope: PlanScope): Promise<LessonPlan> => {
    const loaded = await loadPlan({ db: prisma, ...scope })
    return toPlanJson(loaded, scope.date)
  },

  writeTopic: ({ topic, ...scope }: PlanScope & { topic: string | null }) =>
    prisma.$transaction(async (tx): Promise<LessonPlan> => {
      await lockOrganization({ tx, organizationId: scope.organizationId })
      const loaded = await loadPlan({ db: tx, ...scope })
      const row = await upsertPlan({ tx, groupId: loaded.group.id, date: scope.date, startTime: scope.startTime, updatedById: scope.viewer.userId, data: { topic } })
      return toPlanJson({ ...loaded, row }, scope.date)
    }),

  writeCovered: ({ covered, ...scope }: PlanScope & { covered: string | null }) =>
    prisma.$transaction(async (tx): Promise<LessonPlan> => {
      await lockOrganization({ tx, organizationId: scope.organizationId })
      const loaded = await loadPlan({ db: tx, ...scope })
      checkCanEditCovered(loaded)
      const row = await upsertPlan({ tx, groupId: loaded.group.id, date: scope.date, startTime: scope.startTime, updatedById: scope.viewer.userId, data: { covered } })
      return toPlanJson({ ...loaded, row }, scope.date)
    }),
}
