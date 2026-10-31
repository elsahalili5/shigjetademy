import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '#/modules/auth/api/auth-api'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { storeActiveOrganizationId } from '#/modules/auth/utils/active-organization-storage'
import { invitationsApi } from '../api/invitations-api'

/** Accepts the invitation, reloads the session so the new membership is in it, and makes that organization the active one */
export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const accepted = await invitationsApi.accept(token)
      queryClient.setQueryData(ME_QUERY_KEY, await authApi.me())
      storeActiveOrganizationId(accepted.organization_id)
      return accepted
    },
  })
}
