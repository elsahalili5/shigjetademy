import type { Prisma } from '@generated/prisma/client.ts'
import type { GroupInput, LessonReschedule, LessonRescheduleInput } from '@shigjetademy/shared/groups'
import { toClock, toDate, toDay, toTime } from '@lib/calendar-day.ts'
import { getOrganizationNow } from '@lib/current-period.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { findMovedInClash, findOverlap, findRescheduleOf, findScheduledSession, getOffScheduleReason, getSessions } from '@modules/attendance/lesson-calendar.ts'
import type { LessonGroup } from '@modules/attendance/lesson-calendar.ts'
import { lessonGroupSelectOn, toLessonGroup } from '@modules/attendance/lesson-group.ts'
import { byNewSlot } from './rescheduled-lessons.ts'

const rescheduleSelect = {
  id: true,
  original_date: true,
  original_start_time: true,
  new_date: true,
  new_start_time: true,
  new_end_time: true,
  reason: true,
  created_at: true,
  cancelled_at: true,
} as const satisfies Prisma.LessonRescheduleSelect

type StoredReschedule = Prisma.LessonRescheduleGetPayload<{ select: typeof rescheduleSelect }>

type ToRescheduleJsonParams = {
  reschedule: StoredReschedule
  group: LessonGroup
}

/** The reschedule as the API answers it; the original's end comes from the weekly schedule, and is null once that no longer has it */
const toRescheduleJson = ({ reschedule, group }: ToRescheduleJsonParams): LessonReschedule => {
  const originalDate = toDay(reschedule.original_date)
  const originalStart = toClock(reschedule.original_start_time)
  return {
    id: reschedule.id,
    original_date: originalDate,
    original_start_time: originalStart,
    original_end_time: findScheduledSession({ group, day: originalDate, startTime: originalStart })?.end_time ?? null,
    new_date: toDay(reschedule.new_date),
    new_start_time: toClock(reschedule.new_start_time),
    new_end_time: toClock(reschedule.new_end_time),
    reason: reschedule.reason,
    status: reschedule.cancelled_at ? 'CANCELLED' : 'ACTIVE',
    created_at: reschedule.created_at.toISOString(),
    cancelled_at: reschedule.cancelled_at?.toISOString() ?? null,
  }
}

/** "Group A from 2026-11-16 09:00 to 2026-11-20 16:00", as the activity log keeps it */
const describeMove = ({ groupName, reschedule }: { groupName: string; reschedule: StoredReschedule }) =>
  `${groupName} from ${toDay(reschedule.original_date)} ${toClock(reschedule.original_start_time)} to ${toDay(reschedule.new_date)} ${toClock(reschedule.new_start_time)}`

type Db = Pick<Prisma.TransactionClient, 'group'>

type LoadGroupParams = {
  db: Db
  organizationId: string
  groupId: string
  /** The days whose registers on record the rules need */
  days: string[]
}

/** The organization's group as the lesson rules read it, or a 404 */
const loadGroup = async ({ db, organizationId, groupId, days }: LoadGroupParams) => {
  const group = await db.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: lessonGroupSelectOn(days) })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  return { group, lessonGroup: toLessonGroup(group) }
}

type CheckActiveGroupParams = {
  status: 'ACTIVE' | 'ARCHIVED'
}

const checkActiveGroup = ({ status }: CheckActiveGroupParams) => {
  if (status === 'ARCHIVED') {
    throw new HttpError(409, 'This group is archived, so its lessons can’t be moved.')
  }
}

type HasMarksParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  date: string
  startTime: string
}

/** Whether the session's register has any mark */
const hasMarks = async ({ tx, groupId, date, startTime }: HasMarksParams) => (await tx.attendanceRecord.count({ where: { group_id: groupId, date: toDate(date), start_time: toTime(startTime) } })) > 0

type CheckOriginalParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  group: LessonGroup
  data: LessonRescheduleInput
  now: string
}

/** The original must be a regular session of the group that hasn't started, with no marks, and not moved already */
const checkOriginal = async ({ tx, groupId, group, data, now }: CheckOriginalParams) => {
  const { original_date: day, original_start_time: startTime } = data
  const original = findScheduledSession({ group, day, startTime })
  if (!original) {
    throw new HttpError(409, `This group has no regular lesson on ${day} at ${startTime}.`)
  }
  if (findRescheduleOf({ group, day, startTime })) {
    throw new HttpError(409, 'This lesson is already moved. Cancel that first to move it again.')
  }
  if (`${day} ${startTime}` <= now) {
    throw new HttpError(409, 'This lesson has already started, so it can’t be moved.')
  }
  if (await hasMarks({ tx, groupId, date: day, startTime })) {
    throw new HttpError(409, 'This lesson already has attendance marks, so it can’t be moved.')
  }
}

type CheckNewSlotParams = {
  group: LessonGroup
  hasTerm: boolean
  data: LessonRescheduleInput
  now: string
}

/** The new slot must be ahead, on a day the group's schedule runs, and clear of the group's other sessions that day */
const checkNewSlot = ({ group, hasTerm, data, now }: CheckNewSlotParams) => {
  const day = data.new_date
  const isSameDay = day === data.original_date
  const isSameStart = data.new_start_time === data.original_start_time
  const isSameEnd = data.new_end_time === findScheduledSession({ group, day: data.original_date, startTime: data.original_start_time })?.end_time
  if (isSameDay && isSameStart && isSameEnd) {
    throw refuseField({ field: 'new_date', status: 400, message: 'Choose another date or time than the lesson’s own.' })
  }
  if (`${day} ${data.new_start_time}` <= now) {
    throw refuseField({ field: 'new_date', status: 400, message: 'Choose a time that hasn’t passed.' })
  }
  const offSchedule = getOffScheduleReason({ group, day })
  switch (offSchedule) {
    case 'OUTSIDE_PERIOD':
      throw refuseField({ field: 'new_date', status: 400, message: hasTerm ? 'Choose a day inside the group’s term.' : 'Choose a day inside the group’s school year.' })
    case 'HOLIDAY':
      throw refuseField({ field: 'new_date', status: 400, message: 'This day is a holiday.' })
    case null:
      break
    default: {
      const unhandled: never = offSchedule
      throw new Error(`Unhandled off-schedule reason: ${String(unhandled)}`)
    }
  }
  // The session being moved frees its own slot
  const others = getSessions({ group, day }).filter((session) => !(isSameDay && session.start_time === data.original_start_time && !session.rescheduled_from))
  const overlap = findOverlap({ sessions: others, slot: { start_time: data.new_start_time, end_time: data.new_end_time } })
  if (overlap) {
    throw refuseField({ field: 'new_start_time', status: 400, message: `This overlaps the group’s lesson at ${overlap.start_time}–${overlap.end_time}.` })
  }
}

type CheckMovedLessonsKeptParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  data: GroupInput
  today: string
}

/**
 * A group edit can't leave a move to today or later off its new schedule's term or year, on a holiday, or overlapping a scheduled session;
 * runs before the schedule is replaced. Earlier moves are history.
 */
export const checkMovedLessonsKept = async ({ tx, groupId, data, today }: CheckMovedLessonsKeptParams) => {
  const upcoming = toDate(today)
  const reschedules = await tx.lessonReschedule.findMany({
    where: { group_id: groupId, cancelled_at: null, OR: [{ new_date: { gte: upcoming } }, { original_date: { gte: upcoming } }] },
    select: { original_date: true, original_start_time: true, new_date: true, new_start_time: true, new_end_time: true },
  })
  if (reschedules.length === 0) return
  const year = await tx.academicYear.findUniqueOrThrow({ where: { id: data.academic_year_id }, select: { start_date: true, end_date: true, holidays: { select: { start_date: true, end_date: true } } } })
  const term = data.academic_term_id ? await tx.academicTerm.findUniqueOrThrow({ where: { id: data.academic_term_id }, select: { start_date: true, end_date: true } }) : null
  const toDays = (range: { start_date: Date; end_date: Date }) => ({ start_date: toDay(range.start_date), end_date: toDay(range.end_date) })
  const group: LessonGroup = {
    period: toDays(term ?? year),
    holidays: year.holidays.map(toDays),
    meetings: data.schedule,
    assignments: [],
    substitutions: [],
    registers: [],
    reschedules: reschedules.map((row) => ({
      original_date: toDay(row.original_date),
      original_start_time: toClock(row.original_start_time),
      new_date: toDay(row.new_date),
      new_start_time: toClock(row.new_start_time),
      new_end_time: toClock(row.new_end_time),
    })),
  }
  const clash = findMovedInClash({ group, from: today })
  if (!clash) return
  const moved = `${clash.reschedule.new_date} at ${clash.reschedule.new_start_time}–${clash.reschedule.new_end_time}`
  const { kind } = clash
  switch (kind) {
    case 'OVERLAP':
      throw refuseField({ field: 'schedule', status: 409, message: `This overlaps the lesson moved to ${moved}. Cancel or change that move first.` })
    case 'OUTSIDE_PERIOD':
      throw refuseField({ field: term ? 'academic_term_id' : 'academic_year_id', status: 409, message: `The lesson moved to ${moved} falls outside this ${term ? 'term' : 'school year'}. Cancel or change that move first.` })
    case 'HOLIDAY':
      throw refuseField({ field: 'academic_year_id', status: 409, message: `The lesson moved to ${moved} falls on a holiday of this school year. Cancel or change that move first.` })
    default: {
      const unhandled: never = kind
      throw new Error(`Unhandled clash: ${String(unhandled)}`)
    }
  }
}

type ListParams = {
  organizationId: string
  groupId: string
}

type RescheduleParams = ListParams & {
  actorId: string
  data: LessonRescheduleInput
}

type CancelParams = ListParams & {
  actorId: string
  rescheduleId: string
}

export const LessonRescheduleService = {
  // Cancelled ones too, by the day and time they moved to
  listReschedules: async ({ organizationId, groupId }: ListParams) => {
    const { lessonGroup } = await loadGroup({ db: prisma, organizationId, groupId, days: [] })
    const reschedules = await prisma.lessonReschedule.findMany({ where: { group_id: groupId }, orderBy: byNewSlot, select: rescheduleSelect })
    return reschedules.map((reschedule) => toRescheduleJson({ reschedule, group: lessonGroup }))
  },

  // Moves one session; the group's other sessions and its weekly schedule stay as they are
  reschedule: ({ organizationId, groupId, actorId, data }: RescheduleParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const { group, lessonGroup } = await loadGroup({ db: tx, organizationId, groupId, days: [data.original_date, data.new_date] })
      checkActiveGroup(group)
      const clock = await getOrganizationNow({ db: tx, organizationId })
      const now = `${clock.day} ${clock.clock}`
      await checkOriginal({ tx, groupId, group: lessonGroup, data, now })
      checkNewSlot({ group: lessonGroup, hasTerm: !!group.academic_term, data, now })
      const reschedule = await tx.lessonReschedule.create({
        data: {
          group_id: groupId,
          original_date: toDate(data.original_date),
          original_start_time: toTime(data.original_start_time),
          new_date: toDate(data.new_date),
          new_start_time: toTime(data.new_start_time),
          new_end_time: toTime(data.new_end_time),
          reason: data.reason || null,
          created_by_id: actorId,
        },
        select: rescheduleSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LESSON_RESCHEDULED', organization_id: organizationId, subject_name: describeMove({ groupName: group.name, reschedule }) } })
      return toRescheduleJson({ reschedule, group: lessonGroup })
    }),

  // Brings the original back; refused once the moved session has marks, once either slot has started, or when the original slot is taken since
  cancelReschedule: ({ organizationId, groupId, actorId, rescheduleId }: CancelParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const stored = await tx.lessonReschedule.findFirst({ where: { id: rescheduleId, group_id: groupId, group: { organization_id: organizationId } }, select: rescheduleSelect })
      if (!stored) {
        throw new HttpError(404, 'Reschedule not found')
      }
      const originalDate = toDay(stored.original_date)
      const { group, lessonGroup } = await loadGroup({ db: tx, organizationId, groupId, days: [originalDate] })
      checkActiveGroup(group)
      if (stored.cancelled_at) {
        throw new HttpError(409, 'This reschedule is already cancelled.')
      }
      if (await hasMarks({ tx, groupId, date: toDay(stored.new_date), startTime: toClock(stored.new_start_time) })) {
        throw new HttpError(409, 'The moved lesson already has attendance marks, so it can’t be cancelled.')
      }
      const originalStart = toClock(stored.original_start_time)
      const clock = await getOrganizationNow({ db: tx, organizationId })
      const now = `${clock.day} ${clock.clock}`
      if (`${toDay(stored.new_date)} ${toClock(stored.new_start_time)}` <= now) {
        throw new HttpError(409, 'The moved lesson has already started, so the move can’t be cancelled.')
      }
      if (`${originalDate} ${originalStart}` <= now) {
        throw new HttpError(409, 'The original lesson time has passed, so the move can’t be cancelled.')
      }
      const restored = findScheduledSession({ group: lessonGroup, day: originalDate, startTime: originalStart })
      if (restored) {
        const withoutThis = { ...lessonGroup, reschedules: lessonGroup.reschedules.filter((reschedule) => !(reschedule.original_date === originalDate && reschedule.original_start_time === originalStart)) }
        const others = getSessions({ group: withoutThis, day: originalDate }).filter((session) => !(session.start_time === originalStart && !session.rescheduled_from))
        const overlap = findOverlap({ sessions: others, slot: restored })
        if (overlap) {
          throw new HttpError(409, `The original slot now overlaps the group’s lesson at ${overlap.start_time}–${overlap.end_time}.`)
        }
      }
      const reschedule = await tx.lessonReschedule.update({ where: { id: rescheduleId }, data: { cancelled_at: new Date() }, select: rescheduleSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LESSON_RESCHEDULE_CANCELLED', organization_id: organizationId, subject_name: describeMove({ groupName: group.name, reschedule }) } })
      return toRescheduleJson({ reschedule, group: lessonGroup })
    }),
}
