import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Assignment } from '@shigjetademy/shared/assignments'
import { assignmentsApi } from '../api/assignments-api'
import { forgetAssignment } from '../utils/cache'

type UseRemoveAssignmentParams = {
  organizationId: string
  assignment: Assignment
}

/** Removes an assignment with its hand-ins and files, and takes it off its group's cached list */
export function useRemoveAssignment({ organizationId, assignment }: UseRemoveAssignmentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => assignmentsApi.remove({ organizationId, assignmentId: assignment.id }),
    onSuccess: () => forgetAssignment({ queryClient, organizationId, assignment }),
  })
}
