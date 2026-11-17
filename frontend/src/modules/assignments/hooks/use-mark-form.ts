import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { HandInMark } from '@shigjetademy/shared/assignments'
import { createMarkFormSchema, toMarkFormValues } from '../utils/mark-form'
import type { MarkFormValues } from '../utils/mark-form'

type UseMarkFormParams = {
  maxPoints: number | null
  mark: HandInMark | null
}

export function useMarkForm({ maxPoints, mark }: UseMarkFormParams) {
  return useForm<MarkFormValues>({ resolver: zodResolver(createMarkFormSchema(maxPoints)), defaultValues: toMarkFormValues(mark) })
}
