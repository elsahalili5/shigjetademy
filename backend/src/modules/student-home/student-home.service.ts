import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { MySchool } from '@shigjetademy/shared/students'
import { toDate, toDay } from '@lib/calendar-day.ts'
import { prisma } from '@lib/prisma.ts'

const periodSelect = { name: true, start_date: true, end_date: true } as const

type StoredPeriod = { name: string; start_date: Date; end_date: Date }

const toPeriodJson = ({ name, start_date, end_date }: StoredPeriod) => ({ name, start_date: toDay(start_date), end_date: toDay(end_date) })

/** Today as a 'YYYY-MM-DD' calendar day in the time zone; en-CA writes dates that way */
const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

type GetMySchoolParams = {
  organizationId: string
  userId: string
}

export const StudentHomeService = {
  // Reads the academic period tables directly; the student only ever sees their own record
  getMySchool: async ({ organizationId, userId }: GetMySchoolParams): Promise<MySchool> => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } },
    })
    const today = toDate(todayIn(resolveOrganizationSettings({ stored: organization.settings, country: organization.country }).time_zone))
    const [student, year] = await Promise.all([
      prisma.student.findFirst({ where: { organization_id: organizationId, user_id: userId }, select: { first_name: true, last_name: true, student_number: true } }),
      prisma.academicYear.findFirst({
        where: { organization_id: organizationId, is_current: true },
        select: { ...periodSelect, terms: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: periodSelect, take: 1 } },
      }),
    ])
    const term = year?.terms[0]
    return {
      organization: { id: organization.id, name: organization.name },
      student,
      academic_year: year ? toPeriodJson(year) : null,
      term: term ? toPeriodJson(term) : null,
    }
  },
}
