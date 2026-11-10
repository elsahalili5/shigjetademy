import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GuardianInput, StudentGuardian } from '@shigjetademy/shared/guardians'
import { guardiansApi } from '../api/guardians-api'
import { studentGuardiansQueryKey } from './use-student-guardians'

type UseSaveGuardianParams = {
  organizationId: string
  studentId: string
}

type SaveGuardianParams = { kind: 'add'; input: GuardianInput } | { kind: 'edit'; guardianId: string; input: GuardianInput }

/** Adds a guardian to the student, or saves one; the answered guardian goes straight into the student's list */
export function useSaveGuardian({ organizationId, studentId }: UseSaveGuardianParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveGuardianParams) => {
      switch (params.kind) {
        case 'add':
          return guardiansApi.add({ organizationId, studentId, ...params.input })
        case 'edit':
          return guardiansApi.update({ organizationId, studentId, guardianId: params.guardianId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (saved) =>
      queryClient.setQueryData<StudentGuardian[]>(studentGuardiansQueryKey({ organizationId, studentId }), (guardians = []) =>
        guardians.some((guardian) => guardian.id === saved.id) ? guardians.map((guardian) => (guardian.id === saved.id ? saved : guardian)) : [...guardians, saved],
      ),
  })
}
