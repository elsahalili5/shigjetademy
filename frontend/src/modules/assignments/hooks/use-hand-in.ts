import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { HandInFields, StudentAssignment } from '@shigjetademy/shared/assignments'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

type UseHandInParams = {
  organizationId: string
  assignmentId: string
}

type HandInRequest = {
  fields: Required<HandInFields>
  file: File | null
}

/** Hands in, or replaces the hand-in, and changes the assignment in the student's cached list */
export function useHandIn({ organizationId, assignmentId }: UseHandInParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fields, file }: HandInRequest) => assignmentsApi.handIn({ organizationId, assignmentId, fields, file }),
    onSuccess: (assignment) =>
      queryClient.setQueryData<StudentAssignment[]>(assignmentQueryKeys.mine(organizationId), (assignments) => assignments?.map((item) => (item.id === assignment.id ? assignment : item))),
  })
}
