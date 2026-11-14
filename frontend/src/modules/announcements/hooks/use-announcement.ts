import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AnnouncementSummary } from '@shigjetademy/shared/announcements'
import { announcementsApi } from '../api/announcements-api'
import { ANNOUNCEMENT_POLL_INTERVAL_MS, announcementQueryKeys } from '../utils/query-keys'

type UseAnnouncementParams = {
  organizationId: string
  announcementId: string
}

/**
 * One announcement, polled while it is open so its read count stays current. Opening it marks it read on the server, so the list's unread dot for it
 * goes out here and the total is read again.
 */
export function useAnnouncement({ organizationId, announcementId }: UseAnnouncementParams) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: announcementQueryKeys.detail({ organizationId, announcementId }),
    queryFn: async () => {
      const announcement = await announcementsApi.get({ organizationId, announcementId })
      queryClient.setQueryData<AnnouncementSummary[]>(announcementQueryKeys.list(organizationId), (announcements) =>
        announcements?.map((item) => (item.id === announcementId ? { ...item, is_unread: false } : item)),
      )
      await queryClient.invalidateQueries({ queryKey: announcementQueryKeys.unreadCount(organizationId) })
      return announcement
    },
    refetchInterval: ANNOUNCEMENT_POLL_INTERVAL_MS,
  })
}
