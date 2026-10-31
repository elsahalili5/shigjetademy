import { formatDate, formatDateTime, formatOrganizationDate, formatOrganizationDateTime } from '#/lib/format'
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
