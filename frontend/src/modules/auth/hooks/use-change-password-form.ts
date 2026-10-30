import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { changePasswordSchema } from '@shigjetademy/shared/auth'

// Confirming the new password only matters in the form, so the server schema leaves it out
const changePasswordFormSchema = changePasswordSchema
  .extend({ confirm_password: z.string() })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'The passwords don’t match.',
    path: ['confirm_password'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>

export function useChangePasswordForm() {
  return useForm<ChangePasswordFormValues>({
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    resolver: zodResolver(changePasswordFormSchema),
  })
}
