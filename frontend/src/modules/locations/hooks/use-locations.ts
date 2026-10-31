import { useQuery } from '@tanstack/react-query'
import { locationsApi } from '../api/locations-api'

export const locationsQueryKey = (organizationId: string) => ['organizations', organizationId, 'locations'] as const

export function useLocations(organizationId: string) {
  return useQuery({ queryKey: locationsQueryKey(organizationId), queryFn: () => locationsApi.list(organizationId) })
}
