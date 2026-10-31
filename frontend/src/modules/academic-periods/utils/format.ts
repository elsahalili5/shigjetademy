import type { DayRange } from '@shigjetademy/shared/academic-periods'

// Dates are calendar days, so they are read and shown in UTC and never shift a day
const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const toUtcDate = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** "1 Sep 2026 – 30 Jun 2027" in the user's locale, or one day when it starts and ends on the same day */
export const formatDayRange = ({ start_date, end_date }: DayRange) =>
  start_date === end_date ? dayFormat.format(toUtcDate(start_date)) : dayFormat.formatRange(toUtcDate(start_date), toUtcDate(end_date))
