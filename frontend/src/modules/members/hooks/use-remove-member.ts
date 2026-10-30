import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationMember } from '@shigjetademy/shared/organization'
import { showErrorToast } from '#/lib/error-toast'
import { membersApi } from '../api/members-api'
import { membersQueryKey } from './use-organization-members'

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: membersApi.remove,
    onError: (error) => showErrorToast(error),
    onSuccess: (_, { membershipId }) =>
      queryClient.setQueryData<OrganizationMember[]>(membersQueryKey(organizationId), (members) =>
        members?.filter((member) => member.membership_id !== membershipId),
      ),
  })
}
