import type { MyTeaching } from '@shigjetademy/shared/lecturers'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { toDate } from '@lib/calendar-day.ts'
import { periodSelect, todayIn, toPeriodJson } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'

type GetMyTeachingParams = {
  organizationId: string
  userId: string
}

export const LecturerHomeService = {
  // The lecturer only ever sees their own record, without the staff-only phone, email and notes; today is the organization's calendar day
  getMyTeaching: async ({ organizationId, userId }: GetMyTeachingParams): Promise<MyTeaching> => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } },
    })
    const today = toDate(todayIn(resolveOrganizationSettings({ stored: organization.settings, country: organization.country }).time_zone))
    const [lecturer, year] = await Promise.all([
      prisma.lecturer.findFirst({
        where: { organization_id: organizationId, user_id: userId },
        select: {
          first_name: true,
          last_name: true,
          subjects: true,
          employment_type: true,
          department: { select: { name: true } },
          locations: { select: { location: { select: { name: true } } }, orderBy: { location: { name: 'asc' } } },
        },
      }),
      prisma.academicYear.findFirst({
        where: { organization_id: organizationId, is_current: true },
        select: {
          id: true,
          ...periodSelect,
          terms: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: periodSelect, take: 1 },
          holidays: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: { name: true }, orderBy: { start_date: 'asc' }, take: 1 },
        },
      }),
    ])
    const term = year?.terms[0]
    // The next term of the current year, so the page can say when teaching starts again
    const nextTerm = year
      ? await prisma.academicTerm.findFirst({ where: { academic_year_id: year.id, start_date: { gt: today } }, orderBy: { start_date: 'asc' }, select: periodSelect })
      : null
    return {
      organization: { id: organization.id, name: organization.name },
      lecturer: lecturer && {
        first_name: lecturer.first_name,
        last_name: lecturer.last_name,
        subjects: lecturer.subjects,
        employment_type: lecturer.employment_type,
        department: lecturer.department?.name ?? null,
        locations: lecturer.locations.map((item) => item.location.name),
      },
      academic_year: year ? toPeriodJson(year) : null,
      term: term ? toPeriodJson(term) : null,
      holiday: year?.holidays[0] ?? null,
      next_term: nextTerm ? toPeriodJson(nextTerm) : null,
    }
  },
}
