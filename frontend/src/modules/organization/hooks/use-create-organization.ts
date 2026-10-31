import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { organizationApi } from '../api/organization-api'

// The new owner membership shows up in /auth/me, which the route guards read
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationApi.create,
    onSuccess: () => queryClient.refetchQueries({ queryKey: ME_QUERY_KEY }),
  })
}
