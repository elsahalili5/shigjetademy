import { useQuery } from '@tanstack/react-query'
import { membersApi } from '../api/members-api'

export function usePendingInvitations(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'invitations'], queryFn: () => membersApi.pendingInvitations(organizationId) })
}
