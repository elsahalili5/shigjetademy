import type { DateFormat } from '@shigjetademy/shared/organization-settings'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

/** "31 Oct 2026" in the user's locale */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** "31 Oct 2026, 09:00" in the user's locale */
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))

type FormatOrganizationDateParams = {
  iso: string
  dateFormat: DateFormat
}

/** The date in the order the organization writes dates: "31 Oct 2026" or "Oct 31, 2026", with the month named in the user's locale */
export const formatOrganizationDate = ({ iso, dateFormat: order }: FormatOrganizationDateParams) => {
  const parts = dateFormat.formatToParts(new Date(iso))
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

/** "31 Oct 2026, 09:00": the date in the organization's order, the time in the user's locale */
export const formatOrganizationDateTime = ({ iso, dateFormat: order }: FormatOrganizationDateParams) =>
  `${formatOrganizationDate({ iso, dateFormat: order })}, ${timeFormat.format(new Date(iso))}`
