import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { StudentPage } from '@shigjetademy/shared/students'
import { studentsApi } from '../api/students-api'
import { replaceStudent } from '../utils/student-cache'
import { studentsQueryKey } from './use-students'

export type StudentInvitationAction = 'RESEND' | 'REVOKE'

type StudentInvitationActionParams = {
  studentId: string
  action: StudentInvitationAction
}

/** Resends a student's pending invitation with a new link, or withdraws it; the answered row replaces the cached one */
export function useStudentInvitationAction(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, action }: StudentInvitationActionParams) => {
      switch (action) {
        case 'RESEND':
          return studentsApi.resendInvitation({ organizationId, studentId })
        case 'REVOKE':
          return studentsApi.revokeInvitation({ organizationId, studentId })
        default: {
          const unknown: never = action
          throw new Error(`Unknown invitation action: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (saved) => queryClient.setQueriesData<InfiniteData<StudentPage, number>>({ queryKey: studentsQueryKey(organizationId) }, (data) => replaceStudent({ data, saved })),
  })
}
