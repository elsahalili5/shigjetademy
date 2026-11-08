import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateStudentNoteInput } from '@shigjetademy/shared/student-notes'
import { studentNotesApi } from '../api/student-notes-api'

type UseWriteStudentNoteParams = {
  organizationId: string
  studentId: string
}

export function useWriteStudentNote({ organizationId, studentId }: UseWriteStudentNoteParams) {
  const queryClient = useQueryClient()
  const queryKey = ['organizations', organizationId, 'my-students', studentId, 'notes']
  return useMutation({
    mutationFn: (input: CreateStudentNoteInput) => studentNotesApi.create(organizationId, studentId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
}
