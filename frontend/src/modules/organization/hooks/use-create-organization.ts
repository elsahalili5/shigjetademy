import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { storeActiveOrganizationId } from '#/modules/auth/utils/active-organization-storage'
import { organizationApi } from '../api/organization-api'

// The new organization becomes the active one, and its owner membership shows up in /auth/me, which the route guards read
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationApi.create,
    onSuccess: async (created) => {
      storeActiveOrganizationId(created.id)
      await queryClient.refetchQueries({ queryKey: ME_QUERY_KEY })
    },
  })
}
