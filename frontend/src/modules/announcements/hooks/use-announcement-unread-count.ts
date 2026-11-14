import { useQuery } from '@tanstack/react-query'
import { announcementsApi } from '../api/announcements-api'
import { ANNOUNCEMENT_POLL_INTERVAL_MS, announcementQueryKeys } from '../utils/query-keys'

/** How many announcements the signed-in member hasn't opened yet; polled for the sidebar badge */
export function useAnnouncementUnreadCount(organizationId: string) {
  return useQuery({
    queryKey: announcementQueryKeys.unreadCount(organizationId),
    queryFn: () => announcementsApi.getUnreadCount(organizationId),
    refetchInterval: ANNOUNCEMENT_POLL_INTERVAL_MS,
  })
}
