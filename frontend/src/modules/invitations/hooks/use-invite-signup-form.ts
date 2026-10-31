import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userRegisterSchema } from '@shigjetademy/shared/auth'
import type { RegisterUserInput } from '@shigjetademy/shared/auth'

/** The sign-up form on an invite link: the email is the invited one and can't be changed */
export function useInviteSignupForm(email: string) {
  return useForm<RegisterUserInput>({
    defaultValues: { first_name: '', last_name: '', email, password: '' },
    resolver: zodResolver(userRegisterSchema),
  })
}
