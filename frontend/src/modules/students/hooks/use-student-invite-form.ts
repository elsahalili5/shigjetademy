import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteRecordSchema } from '@shigjetademy/shared/invitations'
import type { InviteRecordInput } from '@shigjetademy/shared/invitations'

export function useStudentInviteForm() {
  return useForm<InviteRecordInput>({
    defaultValues: { email: '' },
    resolver: zodResolver(inviteRecordSchema),
  })
}
