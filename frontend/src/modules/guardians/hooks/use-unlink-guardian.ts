import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { StudentGuardian } from '@shigjetademy/shared/guardians'
import { guardiansApi } from '../api/guardians-api'
import { studentGuardiansQueryKey } from './use-student-guardians'

type UseUnlinkGuardianParams = {
  organizationId: string
  studentId: string
}

/** Removes the guardian's link to this student only; their record and other children stay */
export function useUnlinkGuardian({ organizationId, studentId }: UseUnlinkGuardianParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (guardianId: string) => guardiansApi.unlink({ organizationId, studentId, guardianId }),
    onSuccess: (_answer, guardianId) =>
      queryClient.setQueryData<StudentGuardian[]>(studentGuardiansQueryKey({ organizationId, studentId }), (guardians) => guardians?.filter((guardian) => guardian.id !== guardianId)),
  })
}
