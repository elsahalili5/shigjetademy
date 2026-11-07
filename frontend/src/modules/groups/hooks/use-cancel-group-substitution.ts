import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupLecturersQueryKey } from './use-group-lecturers'

type UseCancelGroupSubstitutionParams = {
  organizationId: string
  groupId: string
}

/** Cancels a substitution; it stays in the group's history and its days are free again */
export function useCancelGroupSubstitution({ organizationId, groupId }: UseCancelGroupSubstitutionParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (substitutionId: string) => groupsApi.cancelSubstitution({ organizationId, groupId, substitutionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupLecturersQueryKey({ organizationId, groupId }) }),
  })
}
