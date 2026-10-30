import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationMember } from '@shigjetademy/shared/organization'
import { showErrorToast } from '#/lib/error-toast'
import { membersApi } from '../api/members-api'
import { membersQueryKey } from './use-organization-members'

// The saved member replaces the cached one, so the list shows the change without a refetch
export function useUpdateMember(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: membersApi.update,
    onError: (error) => showErrorToast(error),
    onSuccess: (saved) =>
      queryClient.setQueryData<OrganizationMember[]>(membersQueryKey(organizationId), (members) =>
        members?.map((member) => (member.membership_id === saved.membership_id ? saved : member)),
      ),
  })
}
