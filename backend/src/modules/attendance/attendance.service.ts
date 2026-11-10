import type { Prisma } from '@generated/prisma/client.ts'
import type { AttendanceRegister, AttendanceSession, AttendanceStatus, AttendanceStudent } from '@shigjetademy/shared/attendance'
import { getWeekday } from '@shigjetademy/shared/calendar-day'
import { getStudentName } from '@shigjetademy/shared/students'
import { toDate, toTime } from '@lib/calendar-day.ts'
import { getOrganizationNow } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { canEditRegister, getPermanentLecturerId, getRegisterWindow, getSession, getSessions, getSubstitution, getTeachingLecturerId } from './lesson-calendar.ts'
import type { LessonGroup, RegisterAccess } from './lesson-calendar.ts'
import { findLecturerId } from './lecturer-lookup.ts'
import { lessonGroupSelectOn, toLessonGroup } from './lesson-group.ts'

/** Who is asking; the route only lets through attendance managers and lecturers */
export type AttendanceViewer = {
  userId: string
  /** The owner, or a school admin with MANAGE_ATTENDANCE */
  isManager: boolean
}

type Db = Prisma.TransactionClient

/** One session's register: the group, the day and the start time */
type RegisterScope = {
  organizationId: string
  viewer: AttendanceViewer
  groupId: string
  date: string
  startTime: string
}

type GetAccessParams = Omit<RegisterScope, 'groupId' | 'startTime'> & {
  db: Db
  group: LessonGroup
}

/** A manager reaches every register; a lecturer only one they teach that day or, on a covered day, permanently teach */
const getAccess = async ({ db, organizationId, viewer, group, date }: GetAccessParams): Promise<RegisterAccess> => {
  if (viewer.isManager) return 'MANAGER'
  const lecturerId = await findLecturerId({ db, organizationId, userId: viewer.userId })
  if (lecturerId && getTeachingLecturerId({ group, day: date }) === lecturerId) return 'TEACHER'
  if (lecturerId && getPermanentLecturerId({ group, day: date }) === lecturerId) return 'READER'
  throw new HttpError(403, 'You don’t teach this group on this day.')
}

type LoadRegisterParams = RegisterScope & {
  db: Db
}

/** The organization's group with its session that day at that start, what the user may do with it, and whether they may mark it now; 404, 403 and 409 in that order */
const loadRegister = async ({ db, organizationId, viewer, groupId, date, startTime }: LoadRegisterParams) => {
  const group = await db.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: lessonGroupSelectOn([date]) })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  const lessonGroup = toLessonGroup(group)
  const access = await getAccess({ db, organizationId, viewer, date, group: lessonGroup })
  const session = getSession({ group: lessonGroup, day: date, startTime })
  if (!session) {
    throw new HttpError(409, `This group has no lesson on this day at ${startTime}.`)
  }
  const window = getRegisterWindow({ day: date, session, now: await getOrganizationNow({ db, organizationId }) })
  const substitute = getSubstitution({ group: lessonGroup, day: date })?.lecturer ?? null
  return { group, access, session, window, substitute, canEdit: canEditRegister({ access, window, isArchived: group.status === 'ARCHIVED' }) }
}

type LoadedRegister = Awaited<ReturnType<typeof loadRegister>>

/** Seats held on the day: enrolled by then, and not withdrawn before it, so a student who leaves or moves stays on that day's register */
const enrolledOn = (date: string) => ({ enrolled_on: { lte: toDate(date) }, OR: [{ withdrawn_on: null }, { withdrawn_on: { gte: toDate(date) } }] }) satisfies Prisma.GroupEnrolmentWhereInput

/** One row per student: someone withdrawn and enrolled again on the same day holds two rows that both cover it */
const uniqueByStudent = <Row extends { student_id: string }>(rows: Row[]) => [...new Map(rows.map((row) => [row.student_id, row])).values()]

const studentSelect = { id: true, first_name: true, last_name: true, status: true } as const satisfies Prisma.StudentSelect

type StoredStudent = Prisma.StudentGetPayload<{ select: typeof studentSelect }>

type ToStudentJsonParams = {
  student: StoredStudent
  status: AttendanceStatus | null
}

const toStudentJson = ({ student, status }: ToStudentJsonParams): AttendanceStudent => ({
  id: student.id,
  first_name: student.first_name,
  last_name: student.last_name,
  is_archived: student.status === 'ARCHIVED',
  status,
})

type ReadRegisterParams = {
  db: Db
  register: LoadedRegister
  date: string
}

/** The session's key on its marks */
const sessionKey = ({ group, session }: LoadedRegister, date: string) => ({ group_id: group.id, date: toDate(date), start_time: toTime(session.start_time) })

/** The register as the API answers it: the students in the group that day, by name, with only their names and their marks in this session */
const readRegister = async ({ db, register, date }: ReadRegisterParams): Promise<AttendanceRegister> => {
  const { group } = register
  const [enrolments, records] = await Promise.all([
    db.groupEnrolment.findMany({
      where: { group_id: group.id, ...enrolledOn(date) },
      orderBy: [{ student: { first_name: 'asc' } }, { student: { last_name: 'asc' } }, { student_id: 'asc' }],
      select: { student_id: true, student: { select: studentSelect } },
    }),
    db.attendanceRecord.findMany({ where: sessionKey(register, date), select: { student_id: true, status: true } }),
  ])
  const statuses = new Map(records.map((record) => [record.student_id, record.status]))
  return {
    group: { id: group.id, name: group.name, course: group.course.name, status: group.status },
    date,
    start_time: register.session.start_time,
    end_time: register.session.end_time,
    rescheduled_from: register.session.rescheduled_from,
    window: register.window,
    can_edit: register.canEdit,
    substitute: register.substitute,
    students: uniqueByStudent(enrolments).map(({ student }) => toStudentJson({ student, status: statuses.get(student.id) ?? null })),
  }
}

/** The permanent lecturer of a covered day only reads its register; refused like the other access checks, before any student or window check */
const checkCanWrite = ({ access }: LoadedRegister) => {
  if (access === 'READER') {
    throw new HttpError(403, 'Your substitute takes this register on this day.')
  }
}

/** Why the user can't mark the register now, if so: nobody marks an archived group or a lesson outside its window */
const checkCanEdit = ({ group, session, window, canEdit }: LoadedRegister) => {
  if (canEdit) return
  if (group.status === 'ARCHIVED') {
    throw new HttpError(409, 'This group is archived, so its register is read-only.')
  }
  if (window === 'UPCOMING') {
    throw new HttpError(409, `This register opens at ${session.start_time}.`)
  }
  throw new HttpError(409, `This register locked at ${session.end_time}.`)
}

type FindEnrolledStudentParams = {
  tx: Db
  organizationId: string
  groupId: string
  date: string
  studentId: string
}

/** The organization's student, if they hold a seat in the group on the day; 404 for a student of no organization of theirs, 409 for one outside the group */
const findEnrolledStudent = async ({ tx, organizationId, groupId, date, studentId }: FindEnrolledStudentParams) => {
  const student = await tx.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: studentSelect })
  if (!student) {
    throw new HttpError(404, 'Student not found')
  }
  const enrolment = await tx.groupEnrolment.findFirst({ where: { group_id: groupId, student_id: studentId, ...enrolledOn(date) }, select: { id: true } })
  if (!enrolment) {
    throw new HttpError(409, 'This student isn’t in this group on this day.')
  }
  return student
}

type LogCorrectionsParams = {
  tx: Db
  organizationId: string
  actorId: string
  register: LoadedRegister
  date: string
  students: Pick<StoredStudent, 'first_name' | 'last_name'>[]
}

/** Marks inside the lesson window are the register being taken; a change after it locks is a correction, logged once per student */
const logCorrections = async ({ tx, organizationId, actorId, register, date, students }: LogCorrectionsParams) => {
  if (register.window !== 'LOCKED' || students.length === 0) return
  await tx.activityLog.createMany({
    data: students.map((student) => ({
      actor_id: actorId,
      action: 'ATTENDANCE_CORRECTED' as const,
      organization_id: organizationId,
      subject_name: `${getStudentName(student)} in ${register.group.name} on ${date}, ${register.session.start_time}`,
    })),
  })
}

type MarkStudentParams = RegisterScope & {
  studentId: string
  status: AttendanceStatus
}

type ListGroupsParams = {
  organizationId: string
  viewer: AttendanceViewer
  date: string
}

export const AttendanceService = {
  // Managers see every session of an active group that day; a lecturer only those they teach that day, so a covered day goes to the substitute
  listSessions: async ({ organizationId, viewer, date }: ListGroupsParams): Promise<AttendanceSession[]> => {
    const lecturerId = viewer.isManager ? null : await findLecturerId({ db: prisma, organizationId, userId: viewer.userId })
    if (!viewer.isManager && !lecturerId) return []
    const teachingFilter = lecturerId ? { OR: [{ lecturer_assignments: { some: { lecturer_id: lecturerId } } }, { substitutions: { some: { lecturer_id: lecturerId } } }] } : {}
    // Narrows the groups to read; the lesson calendar decides
    const mayMeetFilter = {
      OR: [{ meetings: { some: { weekday: getWeekday(date) } } }, { reschedules: { some: { new_date: toDate(date), cancelled_at: null } } }, { attendance: { some: { date: toDate(date) } } }],
    }
    const groups = await prisma.group.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE', AND: [mayMeetFilter, teachingFilter] },
      select: lessonGroupSelectOn([date]),
    })
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

  getRegister: async (scope: RegisterScope) => {
    const register = await loadRegister({ db: prisma, ...scope })
    return readRegister({ db: prisma, register, date: scope.date })
  },

  // One row per student and session, so changing a mark updates it
  markStudent: ({ studentId, status, ...scope }: MarkStudentParams) =>
    prisma.$transaction(async (tx): Promise<AttendanceStudent> => {
      const { organizationId, viewer, groupId, date } = scope
      await lockOrganization({ tx, organizationId })
      const register = await loadRegister({ db: tx, ...scope })
      checkCanWrite(register)
      const student = await findEnrolledStudent({ tx, organizationId, groupId, date, studentId })
      checkCanEdit(register)
      const key = { ...sessionKey(register, date), student_id: studentId }
      const previous = await tx.attendanceRecord.findUnique({ where: { group_id_student_id_date_start_time: key }, select: { status: true } })
      const record = await tx.attendanceRecord.upsert({
        where: { group_id_student_id_date_start_time: key },
        create: { ...key, status, marked_by_id: viewer.userId },
        update: { status, marked_by_id: viewer.userId },
        select: { status: true },
      })
      await logCorrections({ tx, organizationId, actorId: viewer.userId, register, date, students: previous?.status === status ? [] : [student] })
      return toStudentJson({ student, status: record.status })
    }),

  // Marks stay as they are; only students nobody has marked in this session become present. After the lock, each of them is a correction of its own.
  markAllPresent: (scope: RegisterScope) =>
    prisma.$transaction(async (tx) => {
      const { organizationId, viewer, groupId, date } = scope
      await lockOrganization({ tx, organizationId })
      const register = await loadRegister({ db: tx, ...scope })
      checkCanWrite(register)
      checkCanEdit(register)
      const [enrolments, records] = await Promise.all([
        tx.groupEnrolment.findMany({ where: { group_id: groupId, ...enrolledOn(date) }, select: { student_id: true, student: { select: { first_name: true, last_name: true } } } }),
        tx.attendanceRecord.findMany({ where: sessionKey(register, date), select: { student_id: true } }),
      ])
      const marked = new Set(records.map((record) => record.student_id))
      const unmarked = uniqueByStudent(enrolments).filter((enrolment) => !marked.has(enrolment.student_id))
      await tx.attendanceRecord.createMany({ data: unmarked.map((enrolment) => ({ ...sessionKey(register, date), student_id: enrolment.student_id, status: 'PRESENT' as const, marked_by_id: viewer.userId })) })
      await logCorrections({ tx, organizationId, actorId: viewer.userId, register, date, students: unmarked.map((enrolment) => enrolment.student) })
      return readRegister({ db: tx, register, date })
    }),
}
