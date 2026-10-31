import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { organizationSettingsApi } from '../api/organization-settings-api'

// The session is reloaded before the caller moves on, so the old owner's role, sidebar and guards change at once
export function useTransferOwnership(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationSettingsApi.transferOwnership,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      queryClient.removeQueries({ queryKey: ['organizations', organizationId] })
    },
  })
}
