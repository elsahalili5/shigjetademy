import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema } from '@shigjetademy/shared/auth'
import type { AuthUser, UpdateProfileInput } from '@shigjetademy/shared/auth'

export function useProfileForm(user: AuthUser) {
  return useForm<UpdateProfileInput>({
    defaultValues: { first_name: user.first_name, last_name: user.last_name, email: user.email },
    resolver: zodResolver(updateProfileSchema),
  })
}
