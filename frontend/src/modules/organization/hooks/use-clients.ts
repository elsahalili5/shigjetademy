import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '../api/organization-api'

export const CLIENTS_QUERY_KEY = ['organizations', 'clients'] as const

/** Every client organization, for the platform admin */
export function useClients() {
  return useQuery({ queryKey: CLIENTS_QUERY_KEY, queryFn: organizationApi.list })
}
