import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userLoginSchema } from '@shigjetademy/shared/auth'
import type { LoginUserInput } from '@shigjetademy/shared/auth'

export function useLoginForm() {
  return useForm<LoginUserInput>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(userLoginSchema),
  })
}
