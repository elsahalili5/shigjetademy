import { useQuery } from '@tanstack/react-query'
import { membersApi } from '../api/members-api'

export const pendingInvitationsQueryKey = (organizationId: string) => ['organizations', organizationId, 'invitations'] as const

export function usePendingInvitations(organizationId: string) {
  return useQuery({ queryKey: pendingInvitationsQueryKey(organizationId), queryFn: () => membersApi.pendingInvitations(organizationId) })
}
