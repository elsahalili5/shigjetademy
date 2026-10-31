import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { StudentStatus } from '@shigjetademy/shared/students'
import { studentsApi } from '../api/students-api'
import { studentsQueryKey } from './use-students'

type SetStudentStatusParams = {
  studentId: string
  status: StudentStatus
}

/** Archives a student or restores them; the record and its history stay either way */
export function useSetStudentStatus(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, status }: SetStudentStatusParams) => {
      switch (status) {
        case 'ARCHIVED':
          return studentsApi.archive({ organizationId, studentId })
        case 'ACTIVE':
          return studentsApi.restore({ organizationId, studentId })
        default: {
          const unknown: never = status
          throw new Error(`Unknown student status: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentsQueryKey(organizationId) }),
  })
}
