import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { handInFormSchema } from '../utils/hand-in-form'
import type { HandInFormValues } from '../utils/hand-in-form'

export function useHandInForm(defaultValues: HandInFormValues) {
  return useForm<HandInFormValues>({ resolver: zodResolver(handInFormSchema), defaultValues })
}
