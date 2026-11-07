import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { groupEnrolmentSchema } from '@shigjetademy/shared/groups'
import type { GroupEnrolmentInput } from '@shigjetademy/shared/groups'

export function useGroupEnrolmentForm() {
  return useForm<GroupEnrolmentInput>({ resolver: zodResolver(groupEnrolmentSchema), defaultValues: { student_id: '' } })
}
