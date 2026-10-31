import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Permission } from '@shigjetademy/shared/auth'
import { updateMemberSchema } from '@shigjetademy/shared/organization'
import type { UpdateMemberInput } from '@shigjetademy/shared/organization'

export function useAdminAccessForm(permissions: Permission[]) {
  return useForm<UpdateMemberInput>({
    defaultValues: { permissions },
    resolver: zodResolver(updateMemberSchema),
  })
}
