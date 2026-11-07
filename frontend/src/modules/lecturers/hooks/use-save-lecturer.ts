import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LecturerInput } from '@shigjetademy/shared/lecturers'
import { lecturersApi } from '../api/lecturers-api'
import { lecturersQueryKey } from './use-lecturers'

type SaveLecturerParams = { kind: 'add'; input: LecturerInput } | { kind: 'edit'; lecturerId: string; input: LecturerInput }

/** Adds or edits a lecturer; the list and the subject suggestions load again, since either may have changed */
export function useSaveLecturer(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveLecturerParams) => {
      switch (params.kind) {
        case 'add':
          return lecturersApi.create({ organizationId, ...params.input })
        case 'edit':
          return lecturersApi.update({ organizationId, lecturerId: params.lecturerId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lecturersQueryKey(organizationId) }),
  })
}
