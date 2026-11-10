// A lecturer's own students, read from the groups they currently, permanently teach: no notes, guardians or assignments.
// The owner and admins with MANAGE_COURSES or MANAGE_STUDENTS reach every active group's students, the same access pattern as lesson plans and attendance,
// and a student's whole history in the organization.
import type { Prisma } from '@generated/prisma/client.ts'
import type { RosterEntry, StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { findLecturerId } from '@modules/attendance/lecturer-lookup.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { getStudentAttendance } from './student-attendance.ts'

/** Who is asking; the route only lets through lecturers and admins with MANAGE_COURSES or MANAGE_STUDENTS */
export type StudentRosterViewer = {
  userId: string
  /** The owner, or a school admin with MANAGE_COURSES or MANAGE_STUDENTS */
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

type StudentGroupsParams = ListRosterParams & { studentId: string }

/**
 * The student's groups this viewer may read: for a manager every group they were ever enrolled in, ended enrolments and archived
 * groups included; for a lecturer only their current groups the student is actively in. Null when a lecturer isn't linked to a record.
 */
const studentGroupsFilter = async ({ organizationId, viewer, studentId }: StudentGroupsParams): Promise<Prisma.GroupWhereInput | null> => {
  if (viewer.isManager) return { organization_id: organizationId, enrolments: { some: { student_id: studentId } } }
  const groups = await currentGroupsFilter({ organizationId, viewer })
  return groups ? { ...groups, enrolments: { some: { student_id: studentId, ...activeEnrolments } } } : null
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
  getStudentDetail: async ({ organizationId, viewer, studentId }: StudentGroupsParams): Promise<StudentRosterDetail> => {
    const student = await prisma.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { id: true, first_name: true, last_name: true } })
    if (!student) {
      throw new HttpError(404, 'Student not found')
    }
    const groups = await studentGroupsFilter({ organizationId, viewer, studentId })
    const visibleGroups = groups ? await prisma.group.findMany({ where: groups, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : []
    if (!viewer.isManager && visibleGroups.length === 0) {
      throw new HttpError(403, 'You don’t teach this student.')
    }
    const { attendance, summary } = await getStudentAttendance({ studentId, groupIds: visibleGroups.map((group) => group.id) })
    return { student, groups: visibleGroups, attendance, summary }
  },
}
