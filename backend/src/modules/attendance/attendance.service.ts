import type { Prisma } from '@generated/prisma/client.ts'
import type { AttendanceGroup, AttendanceRegister, AttendanceStatus, AttendanceStudent } from '@shigjetademy/shared/attendance'
import { getStudentName } from '@shigjetademy/shared/students'
import { toClock, toDate, toDay } from '@lib/calendar-day.ts'
import { getOrganizationNow } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { meetingsSelect } from '@modules/groups/group-schedule.ts'
import { canEditRegister, getLesson, getPermanentLecturerId, getRegisterWindow, getSubstitution, getTeachingLecturerId, getWeekday } from './lesson-calendar.ts'
import type { LessonGroup, RegisterAccess } from './lesson-calendar.ts'

const daysSelect = { start_date: true, end_date: true } as const

/** What the lesson rules and the answers read of a group */
const lessonGroupSelect = {
  id: true,
  name: true,
  status: true,
  course: { select: { name: true } },
  location: { select: { name: true } },
  academic_year: { select: { ...daysSelect, holidays: { select: daysSelect } } },
  academic_term: { select: daysSelect },
  meetings: meetingsSelect,
  lecturer_assignments: { select: { id: true, lecturer_id: true, ...daysSelect } },
  substitutions: { where: { cancelled_at: null }, select: { lecturer_id: true, ...daysSelect, lecturer: { select: { first_name: true, last_name: true } } } },
} as const satisfies Prisma.GroupSelect

type StoredLessonGroup = Prisma.GroupGetPayload<{ select: typeof lessonGroupSelect }>

type StoredDays = {
  start_date: Date
  end_date: Date
}

const toDays = ({ start_date, end_date }: StoredDays) => ({ start_date: toDay(start_date), end_date: toDay(end_date) })

/** The group as the pure lesson rules read it */
const toLessonGroup = (group: StoredLessonGroup): LessonGroup => ({
  period: toDays(group.academic_term ?? group.academic_year),
  holidays: group.academic_year.holidays.map(toDays),
  meetings: group.meetings.map((meeting) => ({ weekday: meeting.weekday, start_time: toClock(meeting.start_time), end_time: toClock(meeting.end_time) })),
  assignments: group.lecturer_assignments.map((row) => ({ id: row.id, lecturer_id: row.lecturer_id, start_date: toDay(row.start_date), end_date: row.end_date && toDay(row.end_date) })),
  substitutions: group.substitutions.map((row) => ({ lecturer_id: row.lecturer_id, lecturer: row.lecturer, ...toDays(row) })),
})

/** Who is asking; the route only lets through attendance managers and lecturers */
export type AttendanceViewer = {
  userId: string
  /** The owner, or a school admin with MANAGE_ATTENDANCE */
  isManager: boolean
}

type Db = Prisma.TransactionClient

type FindLecturerIdParams = {
  db: Db
  organizationId: string
  userId: string
}

/** The lecturer record linked to the login in this organization, if any */
const findLecturerId = async ({ db, organizationId, userId }: FindLecturerIdParams) =>
  (await db.lecturer.findFirst({ where: { organization_id: organizationId, user_id: userId }, select: { id: true } }))?.id ?? null

type RegisterScope = {
  organizationId: string
  viewer: AttendanceViewer
  groupId: string
  date: string
}

type GetAccessParams = Omit<RegisterScope, 'groupId'> & {
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

/** The organization's group with its lesson that day, what the user may do with it, and whether they may mark it now; 404, 403 and 409 in that order */
const loadRegister = async ({ db, organizationId, viewer, groupId, date }: LoadRegisterParams) => {
  const group = await db.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: lessonGroupSelect })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  const lessonGroup = toLessonGroup(group)
  const access = await getAccess({ db, organizationId, viewer, date, group: lessonGroup })
  const lesson = getLesson({ group: lessonGroup, day: date })
  if (!lesson) {
    throw new HttpError(409, 'This group has no lesson on this day.')
  }
  const window = getRegisterWindow({ day: date, lesson, now: await getOrganizationNow({ db, organizationId }) })
  const substitute = getSubstitution({ group: lessonGroup, day: date })?.lecturer ?? null
  return { group, access, lesson, window, substitute, canEdit: canEditRegister({ access, window, isArchived: group.status === 'ARCHIVED' }) }
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

/** The register as the API answers it: the students in the group that day, by name, with only their names and marks */
const readRegister = async ({ db, register, date }: ReadRegisterParams): Promise<AttendanceRegister> => {
  const { group } = register
  const [enrolments, records] = await Promise.all([
    db.groupEnrolment.findMany({
      where: { group_id: group.id, ...enrolledOn(date) },
      orderBy: [{ student: { first_name: 'asc' } }, { student: { last_name: 'asc' } }, { student_id: 'asc' }],
      select: { student_id: true, student: { select: studentSelect } },
    }),
    db.attendanceRecord.findMany({ where: { group_id: group.id, date: toDate(date) }, select: { student_id: true, status: true } }),
  ])
  const statuses = new Map(records.map((record) => [record.student_id, record.status]))
  return {
    group: { id: group.id, name: group.name, course: group.course.name, status: group.status },
    date,
    ...register.lesson,
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
const checkCanEdit = ({ group, lesson, window, canEdit }: LoadedRegister) => {
  if (canEdit) return
  if (group.status === 'ARCHIVED') {
    throw new HttpError(409, 'This group is archived, so its register is read-only.')
  }
  if (window === 'UPCOMING') {
    throw new HttpError(409, `This register opens at ${lesson.opens_at}.`)
  }
  throw new HttpError(409, `This register locked at ${lesson.locks_at}.`)
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
    data: students.map((student) => ({ actor_id: actorId, action: 'ATTENDANCE_CORRECTED' as const, organization_id: organizationId, subject_name: `${getStudentName(student)} in ${register.group.name} on ${date}` })),
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
  // Managers see every active group meeting that day; a lecturer only those they teach that day, so a covered day goes to the substitute
  listGroups: async ({ organizationId, viewer, date }: ListGroupsParams): Promise<AttendanceGroup[]> => {
    const lecturerId = viewer.isManager ? null : await findLecturerId({ db: prisma, organizationId, userId: viewer.userId })
    if (!viewer.isManager && !lecturerId) return []
    const teachingFilter = lecturerId ? { OR: [{ lecturer_assignments: { some: { lecturer_id: lecturerId } } }, { substitutions: { some: { lecturer_id: lecturerId } } }] } : {}
    const groups = await prisma.group.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE', meetings: { some: { weekday: getWeekday(date) } }, ...teachingFilter },
      select: lessonGroupSelect,
    })
    return groups
      .flatMap((group) => {
        const lessonGroup = toLessonGroup(group)
        const lesson = getLesson({ group: lessonGroup, day: date })
        if (!lesson) return []
        if (lecturerId && getTeachingLecturerId({ group: lessonGroup, day: date }) !== lecturerId) return []
        return [{ id: group.id, name: group.name, course: group.course.name, location: group.location?.name ?? null, ...lesson }]
      })
      .toSorted((a, b) => a.opens_at.localeCompare(b.opens_at) || a.name.localeCompare(b.name))
  },

  getRegister: async (scope: RegisterScope) => {
    const register = await loadRegister({ db: prisma, ...scope })
    return readRegister({ db: prisma, register, date: scope.date })
  },

  // One row per student and day, so changing a mark updates it
  markStudent: ({ studentId, status, ...scope }: MarkStudentParams) =>
    prisma.$transaction(async (tx): Promise<AttendanceStudent> => {
      const { organizationId, viewer, groupId, date } = scope
      await lockOrganization({ tx, organizationId })
      const register = await loadRegister({ db: tx, ...scope })
      checkCanWrite(register)
      const student = await findEnrolledStudent({ tx, organizationId, groupId, date, studentId })
      checkCanEdit(register)
      const key = { group_id: groupId, student_id: studentId, date: toDate(date) }
      const previous = await tx.attendanceRecord.findUnique({ where: { group_id_student_id_date: key }, select: { status: true } })
      const record = await tx.attendanceRecord.upsert({
        where: { group_id_student_id_date: key },
        create: { ...key, status, marked_by_id: viewer.userId },
        update: { status, marked_by_id: viewer.userId },
        select: { status: true },
      })
      await logCorrections({ tx, organizationId, actorId: viewer.userId, register, date, students: previous?.status === status ? [] : [student] })
      return toStudentJson({ student, status: record.status })
    }),

  // Marks stay as they are; only students nobody has marked become present. After the lock, each of them is a correction of its own.
  markAllPresent: (scope: RegisterScope) =>
    prisma.$transaction(async (tx) => {
      const { organizationId, viewer, groupId, date } = scope
      await lockOrganization({ tx, organizationId })
      const register = await loadRegister({ db: tx, ...scope })
      checkCanWrite(register)
      checkCanEdit(register)
      const [enrolments, records] = await Promise.all([
        tx.groupEnrolment.findMany({ where: { group_id: groupId, ...enrolledOn(date) }, select: { student_id: true, student: { select: { first_name: true, last_name: true } } } }),
        tx.attendanceRecord.findMany({ where: { group_id: groupId, date: toDate(date) }, select: { student_id: true } }),
      ])
      const marked = new Set(records.map((record) => record.student_id))
      const unmarked = uniqueByStudent(enrolments).filter((enrolment) => !marked.has(enrolment.student_id))
      await tx.attendanceRecord.createMany({ data: unmarked.map((enrolment) => ({ group_id: groupId, student_id: enrolment.student_id, date: toDate(date), status: 'PRESENT' as const, marked_by_id: viewer.userId })) })
      await logCorrections({ tx, organizationId, actorId: viewer.userId, register, date, students: unmarked.map((enrolment) => enrolment.student) })
      return readRegister({ db: tx, register, date })
    }),
}
