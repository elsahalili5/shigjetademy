// A lecturer's own students, read from the groups they currently, permanently teach: no notes, guardians or assignments.
// The owner and admins with MANAGE_COURSES reach every active group's students, the same access pattern as lesson plans and attendance.
import type { Prisma } from '@generated/prisma/client.ts'
import { ATTENDANCE_STATUSES } from '@shigjetademy/shared/attendance'
import type { AttendanceStatus } from '@shigjetademy/shared/attendance'
import type { RosterEntry, StudentAttendanceSummary, StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { toClock, toDate, toDay } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { findLecturerId } from '@modules/attendance/lecturer-lookup.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'

/** Who is asking; the route only lets through lecturers and admins with MANAGE_COURSES */
export type StudentRosterViewer = {
  userId: string
  /** The owner, or a school admin with MANAGE_COURSES */
  isManager: boolean
}

type CurrentGroupsParams = {
  organizationId: string
  viewer: StudentRosterViewer
}

/**
 * The active groups this viewer currently teaches: every one of the organization's for a manager, or those where the lecturer is the
 * permanent lecturer today, the same "on this day" rule as getRowOn/getLecturerIdOn and the teaching-groups query of lecturer-home;
 * a row scheduled to start later, or one whose lecturer has already changed, doesn't count. Null when a lecturer isn't linked to a record.
 */
const currentGroupsFilter = async ({ organizationId, viewer }: CurrentGroupsParams): Promise<Prisma.GroupWhereInput | null> => {
  if (viewer.isManager) return { organization_id: organizationId, status: 'ACTIVE' }
  const lecturerId = await findLecturerId({ db: prisma, organizationId, userId: viewer.userId })
  if (!lecturerId) return null
  const today = toDate(await getOrganizationToday({ db: prisma, organizationId }))
  return { organization_id: organizationId, status: 'ACTIVE', lecturer_assignments: { some: { lecturer_id: lecturerId, start_date: { lte: today }, OR: [{ end_date: null }, { end_date: { gte: today } }] } } }
}

type ListRosterParams = {
  organizationId: string
  viewer: StudentRosterViewer
}

type StoredAttendanceRecord = {
  date: Date
  start_time: Date
  status: AttendanceStatus
  group: { id: string; name: string }
}

const toAttendanceEntry = (record: StoredAttendanceRecord) => ({ date: toDay(record.date), start_time: toClock(record.start_time), status: record.status, group: record.group })

/** Marked sessions only; present and tardy both count as attended, so the rate never blames a late arrival as absence */
const toSummary = (records: StoredAttendanceRecord[]): StudentAttendanceSummary => {
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((status) => [status, records.filter((record) => record.status === status).length])) as Record<AttendanceStatus, number>
  const total = records.length
  return { present: counts.PRESENT, tardy: counts.TARDY, absent: counts.ABSENT, rate: total === 0 ? null : Math.round(((counts.PRESENT + counts.TARDY) / total) * 100) }
}

export const StudentRosterService = {
  // One row per student per group, so a student in two of the viewer's groups appears twice
  listRoster: async ({ organizationId, viewer }: ListRosterParams): Promise<RosterEntry[]> => {
    const groups = await currentGroupsFilter({ organizationId, viewer })
    if (!groups) return []
    const enrolments = await prisma.groupEnrolment.findMany({
      where: { ...activeEnrolments, group: groups },
      orderBy: [{ student: { first_name: 'asc' } }, { student: { last_name: 'asc' } }, { group: { name: 'asc' } }],
      select: { group: { select: { id: true, name: true } }, student: { select: { id: true, first_name: true, last_name: true, user: { select: { email: true } } } } },
    })
    return enrolments.map(({ group, student }) => ({ student_id: student.id, first_name: student.first_name, last_name: student.last_name, email: student.user?.email ?? null, group }))
  },

  // 404 when the student isn't the organization's own; 403 when a lecturer doesn't currently teach any group the student is in
  getStudentDetail: async ({ organizationId, viewer, studentId }: ListRosterParams & { studentId: string }): Promise<StudentRosterDetail> => {
    const student = await prisma.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { id: true, first_name: true, last_name: true } })
    if (!student) {
      throw new HttpError(404, 'Student not found')
    }
    const groups = await currentGroupsFilter({ organizationId, viewer })
    const sharedGroups = groups
      ? await prisma.group.findMany({ where: { ...groups, enrolments: { some: { student_id: studentId, ...activeEnrolments } } }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : []
    if (!viewer.isManager && sharedGroups.length === 0) {
      throw new HttpError(403, 'You don’t teach this student.')
    }
    const records = await prisma.attendanceRecord.findMany({
      where: { student_id: studentId, group_id: { in: sharedGroups.map((group) => group.id) } },
      orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
      select: { date: true, start_time: true, status: true, group: { select: { id: true, name: true } } },
    })
    return { student, groups: sharedGroups, attendance: records.map(toAttendanceEntry), summary: toSummary(records) }
  },
}
