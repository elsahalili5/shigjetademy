import { formatDate, formatDateTime, formatDay, formatOrganizationDate, formatOrganizationDateTime, formatOrganizationDay, formatOrganizationLessonDay, formatLessonDay } from '#/lib/format'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'

/** Formats dates the way the active organization writes them; without one, like for the platform admin, in the user's locale */
export function useFormatDate() {
  const membership = useActiveMembership()
  if (!membership) return formatDate
  const { date_format: dateFormat } = membership.organization
  return (iso: string) => formatOrganizationDate({ iso, dateFormat })
}

/** Like useFormatDate, with the time of day */
export function useFormatDateTime() {
  const membership = useActiveMembership()
  if (!membership) return formatDateTime
  const { date_format: dateFormat } = membership.organization
  return (iso: string) => formatOrganizationDateTime({ iso, dateFormat })
}

/** Like useFormatDate, for calendar days like "2026-09-01" */
export function useFormatDay() {
  const membership = useActiveMembership()
  if (!membership) return formatDay
  const { date_format: dateFormat } = membership.organization
  return (day: string) => formatOrganizationDay({ day, dateFormat })
}

type LessonSlot = {
  /** 'YYYY-MM-DD' */
  day: string
  /** 'HH:MM', the school's wall clock, shown as stored */
  time: string
}

/** A lesson at its day and start, like "Mon 9 Nov, 09:00", the way the active organization writes days; without one, in the user's locale */
export function useFormatLessonSlot() {
  const membership = useActiveMembership()
  if (!membership) return ({ day, time }: LessonSlot) => `${formatLessonDay(day)}, ${time}`
  const { date_format: dateFormat } = membership.organization
  return ({ day, time }: LessonSlot) => `${formatOrganizationLessonDay({ day, dateFormat })}, ${time}`
}
