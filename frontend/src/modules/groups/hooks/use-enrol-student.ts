import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseEnrolStudentParams = {
  organizationId: string
  groupId: string
}

/** Enrols a student; every group view loads again, since counts show in the list and on the page */
export function useEnrolStudent({ organizationId, groupId }: UseEnrolStudentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) => groupsApi.enrol({ organizationId, groupId, student_id: studentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) }),
  })
}
