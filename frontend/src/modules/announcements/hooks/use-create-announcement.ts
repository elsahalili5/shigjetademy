import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateAnnouncementInput } from '@shigjetademy/shared/announcements'
import { announcementsApi } from '../api/announcements-api'
import { recordAnnouncement } from '../utils/cache'

/** Writes a new announcement and puts it first in the cached list */
export function useCreateAnnouncement(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => announcementsApi.create({ organizationId, ...input }),
    onSuccess: (announcement) => recordAnnouncement({ queryClient, organizationId, announcement }),
  })
}
