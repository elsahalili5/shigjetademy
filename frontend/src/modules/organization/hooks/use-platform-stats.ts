import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '../api/organization-api'

/** Platform-wide numbers, for the platform admin */
export function usePlatformStats() {
  return useQuery({ queryKey: ['organizations', 'stats'], queryFn: organizationApi.stats })
}
