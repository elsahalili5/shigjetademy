import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createStudentNoteSchema } from '@shigjetademy/shared/student-notes'
import type { CreateStudentNoteInput } from '@shigjetademy/shared/student-notes'

type UseStudentNoteFormParams = {
  /** Preselects the group when the viewer shares only one with this student */
  defaultGroupId: string
}

export function useStudentNoteForm({ defaultGroupId }: UseStudentNoteFormParams) {
  return useForm<CreateStudentNoteInput>({ resolver: zodResolver(createStudentNoteSchema), defaultValues: { group_id: defaultGroupId, body: '' } })
}
