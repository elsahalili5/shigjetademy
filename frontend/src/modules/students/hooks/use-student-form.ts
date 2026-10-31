import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { todayDay } from '@shigjetademy/shared/calendar-day'
import { createStudentSchema, updateStudentSchema } from '@shigjetademy/shared/students'
import type { CreateStudentInput, Student } from '@shigjetademy/shared/students'

/** The student being edited, or none when adding; adding leaves the number empty so the server assigns the next one */
export function useStudentForm(student?: Student) {
  return useForm<CreateStudentInput>({
    resolver: zodResolver(student ? updateStudentSchema : createStudentSchema),
    defaultValues: {
      first_name: student?.first_name ?? '',
      last_name: student?.last_name ?? '',
      date_of_birth: student?.date_of_birth ?? '',
      enrolled_on: student?.enrolled_on ?? todayDay(),
      student_number: student?.student_number ?? '',
      notes: student?.notes ?? '',
    },
  })
}
