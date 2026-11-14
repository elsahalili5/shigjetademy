import { useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from '../api/announcements-api'
import { recordAnnouncement } from '../utils/cache'

/** Archives an announcement and shows it archived in the cached list and detail */
export function useArchiveAnnouncement(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) => announcementsApi.archive({ organizationId, announcementId }),
    onSuccess: (announcement) => recordAnnouncement({ queryClient, organizationId, announcement }),
  })
}
