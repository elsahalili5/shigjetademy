import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InviteMemberInput, OrganizationInvitation } from '@shigjetademy/shared/organization'
import { membersApi } from '../api/members-api'
import { pendingInvitationsQueryKey } from './use-pending-invitations'

/** Emails a school admin invitation; the new invitation goes to the top of the cached pending list */
export function useInviteAdmin(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteMemberInput) => membersApi.invite({ organizationId, ...input }),
    onSuccess: (invitation) =>
      queryClient.setQueryData<OrganizationInvitation[]>(pendingInvitationsQueryKey(organizationId), (invitations) => [invitation, ...(invitations ?? [])]),
  })
}
