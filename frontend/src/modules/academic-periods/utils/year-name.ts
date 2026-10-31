import type { DayRange } from '@shigjetademy/shared/academic-periods'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A year's usual name from its dates: "2026–27" across two calendar years, "2026" within one, or '' until both dates are set */
export const suggestYearName = ({ start_date, end_date }: DayRange) => {
  if (!ISO_DAY.test(start_date) || !ISO_DAY.test(end_date)) return ''
  const startYear = Number(start_date.slice(0, 4))
  const endYear = Number(end_date.slice(0, 4))
  if (endYear === startYear) return String(startYear)
  if (endYear === startYear + 1) return `${startYear}–${String(endYear).slice(2)}`
  return `${startYear}–${endYear}`
}
