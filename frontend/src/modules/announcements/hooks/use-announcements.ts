import { useQuery } from '@tanstack/react-query'
import { announcementsApi } from '../api/announcements-api'
import { ANNOUNCEMENT_POLL_INTERVAL_MS, announcementQueryKeys } from '../utils/query-keys'

/** The announcements the signed-in member receives or manages, newest first, polled for new ones */
export function useAnnouncements(organizationId: string) {
  return useQuery({
    queryKey: announcementQueryKeys.list(organizationId),
    queryFn: () => announcementsApi.list(organizationId),
    refetchInterval: ANNOUNCEMENT_POLL_INTERVAL_MS,
  })
}
