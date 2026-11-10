import { todayIn } from '@shigjetademy/shared/calendar-day'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { MySchool } from '@shigjetademy/shared/students'
import { toDate } from '@lib/calendar-day.ts'
import { periodSelect, toPeriodJson } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { getStudentGroups } from './student-groups.ts'

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
    const { groups, rescheduled_lessons } = student ? await getStudentGroups({ organizationId, studentId: student.id, today, weekStart: settings.week_start }) : { groups: [], rescheduled_lessons: [] }
    return {
      organization: { id: organization.id, name: organization.name },
      student: student && { first_name: student.first_name, last_name: student.last_name, student_number: student.student_number },
      academic_year: year ? toPeriodJson(year) : null,
      term: term ? toPeriodJson(term) : null,
      groups,
      rescheduled_lessons,
    }
  },
}
