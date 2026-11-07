import { todayIn } from '@shigjetademy/shared/calendar-day'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { Prisma } from '@generated/prisma/client.ts'
import { toDay } from './calendar-day.ts'

/** The fields a home page shows of a school year or term */
export const periodSelect = { name: true, start_date: true, end_date: true } as const

type StoredPeriod = { name: string; start_date: Date; end_date: Date }

export const toPeriodJson = ({ name, start_date, end_date }: StoredPeriod) => ({ name, start_date: toDay(start_date), end_date: toDay(end_date) })

type GetOrganizationTodayParams = {
  db: Pick<Prisma.TransactionClient, 'organization'>
  organizationId: string
}

/** The organization's calendar day right now, as 'YYYY-MM-DD', and the day its week starts on */
export const getOrganizationCalendar = async ({ db, organizationId }: GetOrganizationTodayParams) => {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } },
  })
  const settings = resolveOrganizationSettings({ stored: organization.settings, country: organization.country })
  return { today: todayIn(settings.time_zone), weekStart: settings.week_start }
}

/** The organization's calendar day right now, as 'YYYY-MM-DD' */
export const getOrganizationToday = async (params: GetOrganizationTodayParams) => (await getOrganizationCalendar(params)).today
