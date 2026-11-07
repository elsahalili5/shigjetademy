import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteRecordSchema } from '@shigjetademy/shared/invitations'
import type { InviteRecordInput } from '@shigjetademy/shared/invitations'

/** Starts from the email on the lecturer's record, which staff can change */
export function useLecturerInviteForm(email: string | null) {
  return useForm<InviteRecordInput>({
    defaultValues: { email: email ?? '' },
    resolver: zodResolver(inviteRecordSchema),
  })
}
