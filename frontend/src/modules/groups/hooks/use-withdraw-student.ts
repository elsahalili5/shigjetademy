import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseWithdrawStudentParams = {
  organizationId: string
  groupId: string
}

/** Withdraws a student; the row stays in the history and the seat is free again */
export function useWithdrawStudent({ organizationId, groupId }: UseWithdrawStudentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enrolmentId: string) => groupsApi.withdraw({ organizationId, groupId, enrolmentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) }),
  })
}
