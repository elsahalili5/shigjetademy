import type { DayRange } from '@shigjetademy/shared/academic-periods'

type FormatDayRangeParams = {
  range: DayRange
  /** Writes one calendar day, in the organization's date format */
  formatDay: (day: string) => string
}

/** "1 Sep 2026 – 30 Jun 2027", or one day when it starts and ends on the same day */
export const formatDayRange = ({ range, formatDay }: FormatDayRangeParams) =>
  range.start_date === range.end_date ? formatDay(range.start_date) : `${formatDay(range.start_date)} – ${formatDay(range.end_date)}`
