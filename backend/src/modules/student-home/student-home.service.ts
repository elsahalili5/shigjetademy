import type { Prisma } from '@generated/prisma/client.ts'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { MySchool } from '@shigjetademy/shared/students'
import { toDate } from '@lib/calendar-day.ts'
import { periodSelect, toPeriodJson } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { byNewSlot, rescheduledLessonSelect, toRescheduledLesson, upcomingReschedules } from '@modules/groups/rescheduled-lessons.ts'
import { meetingsSelect, toScheduleJson } from '@modules/groups/group-schedule.ts'

// What a student reads of a group: no lecturer history, staff notes or other students
const schoolGroupSelect = {
  id: true,
  name: true,
  course: { select: { name: true } },
  academic_year: { select: { name: true } },
  academic_term: { select: { name: true } },
  location: { select: { name: true } },
  meetings: meetingsSelect,
} as const

type GetMySchoolParams = {
  organizationId: string
  userId: string
}

export const StudentHomeService = {
  // Reads the academic period and group tables directly; the student only ever sees their own record and groups
  getMySchool: async ({ organizationId, userId }: GetMySchoolParams): Promise<MySchool> => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } },
    })
    const settings = resolveOrganizationSettings({ stored: organization.settings, country: organization.country })
    const today = toDate(todayIn(settings.time_zone))
    const [student, year] = await Promise.all([
      prisma.student.findFirst({ where: { organization_id: organizationId, user_id: userId }, select: { id: true, first_name: true, last_name: true, student_number: true } }),
      prisma.academicYear.findFirst({
        where: { organization_id: organizationId, is_current: true },
        select: { ...periodSelect, terms: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: periodSelect, take: 1 } },
      }),
    ])
    const term = year?.terms[0]
    // The active groups they are in now, in a school year that includes today, like My teaching
    const groupsWhere = student
      ? ({ organization_id: organizationId, status: 'ACTIVE', academic_year: { start_date: { lte: today }, end_date: { gte: today } }, enrolments: { some: { student_id: student.id, ...activeEnrolments } } } satisfies Prisma.GroupWhereInput)
      : null
    const [groups, reschedules] = groupsWhere
      ? await Promise.all([
          prisma.group.findMany({ where: groupsWhere, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: schoolGroupSelect }),
          prisma.lessonReschedule.findMany({ where: { ...upcomingReschedules(today), group: groupsWhere }, orderBy: byNewSlot, select: rescheduledLessonSelect }),
        ])
      : [[], []]
    return {
      organization: { id: organization.id, name: organization.name },
      student: student && { first_name: student.first_name, last_name: student.last_name, student_number: student.student_number },
      academic_year: year ? toPeriodJson(year) : null,
      term: term ? toPeriodJson(term) : null,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        course: group.course.name,
        academic_year: group.academic_year.name,
        academic_term: group.academic_term?.name ?? null,
        location: group.location?.name ?? null,
        schedule: toScheduleJson({ meetings: group.meetings, weekStart: settings.week_start }),
      })),
      rescheduled_lessons: reschedules.map(toRescheduledLesson),
    }
  },
}
