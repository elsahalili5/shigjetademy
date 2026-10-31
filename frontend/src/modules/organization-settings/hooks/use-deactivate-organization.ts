import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { organizationSettingsApi } from '../api/organization-settings-api'

// The session carries the organization's status, so it is reloaded before the caller moves on; the frame and guards then follow it
export function useDeactivateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationSettingsApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  })
}
