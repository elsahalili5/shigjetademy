import { useQuery } from '@tanstack/react-query'
import { studentNotesApi } from '../api/student-notes-api'

type UseStudentNotesParams = {
  organizationId: string
  studentId: string
}

export function useStudentNotes({ organizationId, studentId }: UseStudentNotesParams) {
  return useQuery({ queryKey: ['organizations', organizationId, 'my-students', studentId, 'notes'], queryFn: () => studentNotesApi.list(organizationId, studentId) })
}
