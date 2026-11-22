import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { testFormSchema } from '../utils/test-form'
import type { TestFormValues } from '../utils/test-form'

export function useTestForm(defaultValues: TestFormValues) {
  return useForm<TestFormValues>({ resolver: zodResolver(testFormSchema), defaultValues })
}
