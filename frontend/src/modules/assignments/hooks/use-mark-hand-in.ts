import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AssignmentDetail, MarkHandInInput } from '@shigjetademy/shared/assignments'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

type UseMarkHandInParams = {
  organizationId: string
  assignmentId: string
  submissionId: string
}

/** Saves a mark, and puts the marked hand-in into the assignment's cached page */
export function useMarkHandIn({ organizationId, assignmentId, submissionId }: UseMarkHandInParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MarkHandInInput) => assignmentsApi.mark({ organizationId, assignmentId, submissionId, input }),
    onSuccess: (row) =>
      queryClient.setQueryData<AssignmentDetail>(assignmentQueryKeys.detail({ organizationId, assignmentId }), (detail) =>
        detail ? { ...detail, hand_ins: detail.hand_ins.map((item) => (item.student.id === row.student.id ? row : item)) } : detail,
      ),
  })
}
