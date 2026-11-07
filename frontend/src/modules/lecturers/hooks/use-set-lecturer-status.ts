import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LecturerStatus } from '@shigjetademy/shared/lecturers'
import { lecturersApi } from '../api/lecturers-api'
import { lecturersQueryKey } from './use-lecturers'

type SetLecturerStatusParams = {
  lecturerId: string
  status: LecturerStatus
}

/** Archives a lecturer or restores them; the record and its history stay either way */
export function useSetLecturerStatus(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lecturerId, status }: SetLecturerStatusParams) => {
      switch (status) {
        case 'ARCHIVED':
          return lecturersApi.archive({ organizationId, lecturerId })
        case 'ACTIVE':
          return lecturersApi.restore({ organizationId, lecturerId })
        default: {
          const unknown: never = status
          throw new Error(`Unknown lecturer status: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lecturersQueryKey(organizationId) }),
  })
}
