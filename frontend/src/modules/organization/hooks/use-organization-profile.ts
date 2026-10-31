import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '../api/organization-api'

export const organizationProfileQueryKey = (organizationId: string) => ['organizations', organizationId, 'profile'] as const

export function useOrganizationProfile(organizationId: string) {
  return useQuery({ queryKey: organizationProfileQueryKey(organizationId), queryFn: () => organizationApi.profile(organizationId) })
}
