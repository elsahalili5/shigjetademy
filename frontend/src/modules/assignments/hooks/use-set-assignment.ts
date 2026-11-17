import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateAssignmentFields } from '@shigjetademy/shared/assignments'
import { assignmentsApi } from '../api/assignments-api'
import { recordAssignment } from '../utils/cache'

type SetAssignmentRequest = {
  fields: Required<CreateAssignmentFields>
  file: File | null
}

/** Sets an assignment, with its file when there is one, and puts it into its group's cached list */
export function useSetAssignment(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fields, file }: SetAssignmentRequest) => assignmentsApi.create({ organizationId, fields, file }),
    onSuccess: (assignment) => recordAssignment({ queryClient, organizationId, assignment }),
  })
}
