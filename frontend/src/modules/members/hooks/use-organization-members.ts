import { useQuery } from '@tanstack/react-query'
import { membersApi } from '../api/members-api'

export const membersQueryKey = (organizationId: string) => ['organizations', organizationId, 'members'] as const

export function useOrganizationMembers(organizationId: string) {
  return useQuery({ queryKey: membersQueryKey(organizationId), queryFn: () => membersApi.list(organizationId) })
}
