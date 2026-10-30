import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '../api/organization-api'

export const clientQueryKey = (organizationId: string) => ['organizations', 'client', organizationId] as const

export function useClient(organizationId: string) {
  return useQuery({ queryKey: clientQueryKey(organizationId), queryFn: () => organizationApi.get(organizationId) })
}
