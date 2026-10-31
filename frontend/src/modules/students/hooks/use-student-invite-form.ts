import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteStudentSchema } from '@shigjetademy/shared/invitations'
import type { InviteStudentInput } from '@shigjetademy/shared/invitations'

export function useStudentInviteForm() {
  return useForm<InviteStudentInput>({
    defaultValues: { email: '' },
    resolver: zodResolver(inviteStudentSchema),
  })
}
