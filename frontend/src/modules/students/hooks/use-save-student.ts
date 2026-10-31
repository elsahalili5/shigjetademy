import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateStudentInput, UpdateStudentInput } from '@shigjetademy/shared/students'
import { studentsApi } from '../api/students-api'
import { studentsQueryKey } from './use-students'

type SaveStudentParams = { kind: 'add'; input: CreateStudentInput } | { kind: 'edit'; studentId: string; input: UpdateStudentInput }

export function useSaveStudent(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveStudentParams) => {
      switch (params.kind) {
        case 'add':
          return studentsApi.create({ organizationId, ...params.input })
        case 'edit':
          return studentsApi.update({ organizationId, studentId: params.studentId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentsQueryKey(organizationId) }),
  })
}
