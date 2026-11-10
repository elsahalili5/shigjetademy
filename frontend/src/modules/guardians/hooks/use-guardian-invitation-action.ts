import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { StudentGuardian } from '@shigjetademy/shared/guardians'
import { guardiansApi } from '../api/guardians-api'
import { replaceGuardian } from '../utils/guardian-cache'
import { studentGuardiansQueryKey } from './use-student-guardians'

export type GuardianInvitationAction = 'INVITE' | 'RESEND' | 'REVOKE'

type UseGuardianInvitationActionParams = {
  organizationId: string
  studentId: string
}

type GuardianInvitationActionParams = {
  guardianId: string
  action: GuardianInvitationAction
}

/** Emails a guardian a login link, sends a new one, or withdraws it; the answered guardian replaces the cached one */
export function useGuardianInvitationAction({ organizationId, studentId }: UseGuardianInvitationActionParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ guardianId, action }: GuardianInvitationActionParams) => {
      switch (action) {
        case 'INVITE':
          return guardiansApi.invite({ organizationId, guardianId })
        case 'RESEND':
          return guardiansApi.resendInvitation({ organizationId, guardianId })
        case 'REVOKE':
          return guardiansApi.revokeInvitation({ organizationId, guardianId })
        default: {
          const unknown: never = action
          throw new Error(`Unknown invitation action: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (saved) =>
      queryClient.setQueryData<StudentGuardian[]>(studentGuardiansQueryKey({ organizationId, studentId }), (guardians) => replaceGuardian({ guardians, saved })),
  })
}
