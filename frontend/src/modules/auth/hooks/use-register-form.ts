import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userRegisterSchema } from '@shigjetademy/shared/auth'
import type { RegisterUserInput } from '@shigjetademy/shared/auth'

export function useRegisterForm() {
  return useForm<RegisterUserInput>({
    defaultValues: { first_name: '', last_name: '', email: '', password: '' },
    resolver: zodResolver(userRegisterSchema),
  })
}
