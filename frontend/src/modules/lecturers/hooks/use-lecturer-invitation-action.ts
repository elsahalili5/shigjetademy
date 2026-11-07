import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { LecturerPage } from '@shigjetademy/shared/lecturers'
import { lecturersApi } from '../api/lecturers-api'
import { replaceLecturer } from '../utils/lecturer-cache'
import { lecturersQueryKey } from './use-lecturers'

export type LecturerInvitationAction = 'RESEND' | 'REVOKE'

type LecturerInvitationActionParams = {
  lecturerId: string
  action: LecturerInvitationAction
}

/** Resends a lecturer's pending invitation with a new link, or withdraws it; the answered row replaces the cached one */
export function useLecturerInvitationAction(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lecturerId, action }: LecturerInvitationActionParams) => {
      switch (action) {
        case 'RESEND':
          return lecturersApi.resendInvitation({ organizationId, lecturerId })
        case 'REVOKE':
          return lecturersApi.revokeInvitation({ organizationId, lecturerId })
        default: {
          const unknown: never = action
          throw new Error(`Unknown invitation action: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (saved) =>
      queryClient.setQueriesData<InfiniteData<LecturerPage, number>>({ queryKey: [...lecturersQueryKey(organizationId), 'list'] }, (data) => replaceLecturer({ data, saved })),
  })
}
