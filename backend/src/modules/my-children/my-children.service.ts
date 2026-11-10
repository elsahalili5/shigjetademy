import { todayIn } from '@shigjetademy/shared/calendar-day'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { MyChildDetail } from '@shigjetademy/shared/guardians'
import { toDate } from '@lib/calendar-day.ts'
import { prisma } from '@lib/prisma.ts'
import { getStudentGroups } from '@modules/student-home/student-groups.ts'
import { getStudentAttendance } from '@modules/student-roster/student-attendance.ts'
import { findLinkedChild, linkedChildSelect, linkedChildWhere } from './find-linked-child.ts'

type ListMyChildrenParams = {
  organizationId: string
  userId: string
}

type GetMyChildParams = ListMyChildrenParams & {
  studentId: string
}

export const MyChildrenService = {
  /** The signed-in guardian's linked children in this organization, by name, with nothing but their names */
  listMyChildren: ({ organizationId, userId }: ListMyChildrenParams) =>
    prisma.student.findMany({
      where: linkedChildWhere({ organizationId, userId }),
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }, { id: 'asc' }],
      select: linkedChildSelect,
    }),

  // Everything is read by the id findLinkedChild returned, and every field is picked by the shared helpers' selects
  getMyChild: async ({ organizationId, userId, studentId }: GetMyChildParams): Promise<MyChildDetail> => {
    const child = await findLinkedChild({ organizationId, userId, studentId })
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } } })
    const settings = resolveOrganizationSettings({ stored: organization.settings, country: organization.country })
    const today = toDate(todayIn(settings.time_zone))
    const [school, enrolledGroups] = await Promise.all([
      getStudentGroups({ organizationId, studentId: child.id, today, weekStart: settings.week_start }),
      prisma.group.findMany({ where: { organization_id: organizationId, enrolments: { some: { student_id: child.id } } }, select: { id: true } }),
    ])
    // The history covers every group they were ever in, ended enrolments included, like the manager's view
    const { attendance, summary } = await getStudentAttendance({ studentId: child.id, groupIds: enrolledGroups.map((group) => group.id) })
    return { student: child, ...school, attendance, summary }
  },
}
