import type { DateFormat } from '@shigjetademy/shared/organization-settings'

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
// Calendar days are read and shown in UTC, so they never shift a day
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const toUtcDate = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** "31 Oct 2026" in the user's locale */
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))

/** "31 Oct 2026, 09:00" in the user's locale */
export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso))

/** A calendar day like "2026-09-01" as "1 Sep 2026" in the user's locale */
export const formatDay = (day: string) => dayFormatter.format(toUtcDate(day))

type WriteInOrderParams = {
  formatter: Intl.DateTimeFormat
  date: Date
  order: DateFormat
}

/** The date's parts, named in the user's locale, in the organization's order: "31 Oct 2026" or "Oct 31, 2026" */
const writeInOrder = ({ formatter, date, order }: WriteInOrderParams) => {
  const parts = formatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  switch (order) {
    case 'DAY_MONTH_YEAR':
      return `${part('day')} ${part('month')} ${part('year')}`
    case 'MONTH_DAY_YEAR':
      return `${part('month')} ${part('day')}, ${part('year')}`
    default: {
      const unknown: never = order
      throw new Error(`Unknown date format: ${String(unknown)}`)
    }
  }
}

type FormatOrganizationDateParams = {
  iso: string
  dateFormat: DateFormat
}

/** The date in the order the organization writes dates: "31 Oct 2026" or "Oct 31, 2026" */
export const formatOrganizationDate = ({ iso, dateFormat }: FormatOrganizationDateParams) =>
  writeInOrder({ formatter: dateFormatter, date: new Date(iso), order: dateFormat })

/** "31 Oct 2026, 09:00": the date in the organization's order, the time in the user's locale */
export const formatOrganizationDateTime = ({ iso, dateFormat }: FormatOrganizationDateParams) =>
  `${formatOrganizationDate({ iso, dateFormat })}, ${timeFormatter.format(new Date(iso))}`

type FormatOrganizationDayParams = {
  day: string
  dateFormat: DateFormat
}

/** A calendar day like "2026-09-01" in the organization's order, the same day wherever the user is */
export const formatOrganizationDay = ({ day, dateFormat }: FormatOrganizationDayParams) =>
  writeInOrder({ formatter: dayFormatter, date: toUtcDate(day), order: dateFormat })
