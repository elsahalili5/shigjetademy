import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { lessonRescheduleSchema } from '@shigjetademy/shared/groups'
import type { LessonRescheduleInput } from '@shigjetademy/shared/groups'

const EMPTY_RESCHEDULE: LessonRescheduleInput = { original_date: '', original_start_time: '', new_date: '', new_start_time: '', new_end_time: '', reason: '' }

export function useLessonRescheduleForm() {
  return useForm<LessonRescheduleInput>({ resolver: zodResolver(lessonRescheduleSchema), defaultValues: EMPTY_RESCHEDULE })
}
