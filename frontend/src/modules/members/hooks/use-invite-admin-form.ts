import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import { inviteMemberSchema } from '@shigjetademy/shared/organization'
import type { InviteMemberInput } from '@shigjetademy/shared/organization'

export function useInviteAdminForm() {
  return useForm<InviteMemberInput>({
    defaultValues: { email: '', permissions: [...PERMISSIONS] },
    resolver: zodResolver(inviteMemberSchema),
  })
}
