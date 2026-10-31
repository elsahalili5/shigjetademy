import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InvitationLink, SentInvitation } from '@shigjetademy/shared/invitations'
import type { OrganizationInvitation } from '@shigjetademy/shared/organization'
import { membersApi } from '../api/members-api'
import { pendingInvitationsQueryKey } from './use-pending-invitations'

/** Resend emails a new link; Copy link does the same and also hands the link back; Revoke withdraws the invitation */
export type AdminInvitationAction = 'RESEND' | 'COPY_LINK' | 'REVOKE'

type AdminInvitationActionParams = {
  invitationId: string
  action: AdminInvitationAction
}

export type AdminInvitationOutcome = { action: 'RESEND'; invitation: SentInvitation } | { action: 'COPY_LINK'; invitation: InvitationLink } | { action: 'REVOKE' }

/** Changes a pending admin invitation and keeps the cached pending list in step */
export function useAdminInvitationAction(organizationId: string) {
  const queryClient = useQueryClient()
  const updateList = (update: (invitations: OrganizationInvitation[]) => OrganizationInvitation[]) =>
    queryClient.setQueryData<OrganizationInvitation[]>(pendingInvitationsQueryKey(organizationId), (invitations) => update(invitations ?? []))
  const replaceInList = ({ id, email, role, permissions, created_at, expires_at }: SentInvitation) =>
    updateList((invitations) => invitations.map((item) => (item.id === id ? { id, email, role, permissions, created_at, expires_at } : item)))

  return useMutation({
    mutationFn: async ({ invitationId, action }: AdminInvitationActionParams): Promise<AdminInvitationOutcome> => {
      switch (action) {
        case 'RESEND':
          return { action, invitation: await membersApi.resendInvitation({ organizationId, invitationId }) }
        case 'COPY_LINK':
          return { action, invitation: await membersApi.renewInvitationLink({ organizationId, invitationId }) }
        case 'REVOKE':
          await membersApi.revokeInvitation({ organizationId, invitationId })
          return { action }
        default: {
          const unknown: never = action
          throw new Error(`Unknown invitation action: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (outcome, { invitationId }) => {
      switch (outcome.action) {
        case 'RESEND':
        case 'COPY_LINK':
          replaceInList(outcome.invitation)
          return
        case 'REVOKE':
          updateList((invitations) => invitations.filter((item) => item.id !== invitationId))
          return
        default: {
          const unknown: never = outcome
          throw new Error(`Unknown invitation outcome: ${JSON.stringify(unknown)}`)
        }
      }
    },
  })
}
