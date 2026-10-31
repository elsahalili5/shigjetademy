import { useQuery } from '@tanstack/react-query'
import { organizationApi } from '../api/organization-api'

export function useOrganizationOverview(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'overview'], queryFn: () => organizationApi.overview(organizationId) })
}
