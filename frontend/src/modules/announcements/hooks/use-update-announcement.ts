import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateAnnouncementInput } from '@shigjetademy/shared/announcements'
import { announcementsApi } from '../api/announcements-api'
import { recordAnnouncement } from '../utils/cache'
import { announcementQueryKeys } from '../utils/query-keys'

type UseUpdateAnnouncementParams = {
  organizationId: string
  announcementId: string
}

/** Saves a change to an announcement and shows it changed in the cached list and detail; a refusal reads the announcement again */
export function useUpdateAnnouncement({ organizationId, announcementId }: UseUpdateAnnouncementParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAnnouncementInput) => announcementsApi.update({ organizationId, announcementId, ...input }),
    onSuccess: (announcement) => recordAnnouncement({ queryClient, organizationId, announcement }),
    // A refusal may mean the announcement changed meanwhile, like going out on schedule: read it again so the form offers only what is left
    onError: () => queryClient.invalidateQueries({ queryKey: announcementQueryKeys.detail({ organizationId, announcementId }) }),
  })
}
