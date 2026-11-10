// A student's current groups with their weekly schedule and moved lessons, read by the student's id. Shared by a student's own home and a
// guardian's page for their child, so both show the same thing and neither reads lecturer history, staff notes or other students.
import type { Prisma } from '@generated/prisma/client.ts'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'
import type { MySchoolGroup } from '@shigjetademy/shared/students'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { meetingsSelect, toScheduleJson } from '@modules/groups/group-schedule.ts'
import { byNewSlot, rescheduledLessonSelect, toRescheduledLesson, upcomingReschedules } from '@modules/groups/rescheduled-lessons.ts'

// What a student reads of a group: no lecturer history, staff notes or other students
const schoolGroupSelect = {
  id: true,
  name: true,
  course: { select: { name: true } },
  academic_year: { select: { name: true } },
  academic_term: { select: { name: true } },
  room: { select: { name: true } },
  meetings: meetingsSelect,
} as const satisfies Prisma.GroupSelect

type GetStudentGroupsParams = {
  organizationId: string
  studentId: string
  /** The organization's today as a calendar day */
  today: Date
  weekStart: WeekStart
}

/** The active groups the student is in now, in a school year that includes today, by name, and the lessons of those groups moved to today or later */
export const getStudentGroups = async ({ organizationId, studentId, today, weekStart }: GetStudentGroupsParams) => {
  const where = {
    organization_id: organizationId,
    status: 'ACTIVE',
    academic_year: { start_date: { lte: today }, end_date: { gte: today } },
    enrolments: { some: { student_id: studentId, ...activeEnrolments } },
  } satisfies Prisma.GroupWhereInput
  const [groups, reschedules] = await Promise.all([
    prisma.group.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: schoolGroupSelect }),
    prisma.lessonReschedule.findMany({ where: { ...upcomingReschedules(today), group: where }, orderBy: byNewSlot, select: rescheduledLessonSelect }),
  ])
  return {
    groups: groups.map(
      (group): MySchoolGroup => ({
        id: group.id,
        name: group.name,
        course: group.course.name,
        academic_year: group.academic_year.name,
        academic_term: group.academic_term?.name ?? null,
        location: group.room?.name ?? null,
        schedule: toScheduleJson({ meetings: group.meetings, weekStart }),
      }),
    ),
    rescheduled_lessons: reschedules.map(toRescheduledLesson),
  }
}
