import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseMoveStudentParams = {
  organizationId: string
  groupId: string
  enrolmentId: string
}

/** Moves a student to another group in one step; both groups load again */
export function useMoveStudent({ organizationId, groupId, enrolmentId }: UseMoveStudentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetId: string) => groupsApi.move({ organizationId, groupId, enrolmentId, group_id: targetId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) }),
  })
}
