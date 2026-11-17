import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { assignmentFormSchema } from '../utils/assignment-form'
import type { AssignmentFormValues } from '../utils/assignment-form'

export function useAssignmentForm(defaultValues: AssignmentFormValues) {
  return useForm<AssignmentFormValues>({ resolver: zodResolver(assignmentFormSchema), defaultValues })
}
