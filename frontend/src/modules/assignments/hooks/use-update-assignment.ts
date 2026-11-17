import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateAssignmentFields } from '@shigjetademy/shared/assignments'
import { assignmentsApi } from '../api/assignments-api'
import { recordAssignment } from '../utils/cache'

type UseUpdateAssignmentParams = {
  organizationId: string
  assignmentId: string
}

type UpdateAssignmentRequest = {
  fields: Required<UpdateAssignmentFields>
  file: File | null
}

/** Saves an assignment's details and file, and changes it in its group's cached list */
export function useUpdateAssignment({ organizationId, assignmentId }: UseUpdateAssignmentParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fields, file }: UpdateAssignmentRequest) => assignmentsApi.update({ organizationId, assignmentId, fields, file }),
    onSuccess: (assignment) => recordAssignment({ queryClient, organizationId, assignment }),
  })
}
