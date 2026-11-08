import type { CreateStudentNoteInput, StudentNoteEntry } from '@shigjetademy/shared/student-notes'
import { apiClient } from '#/api/client'

export const studentNotesApi = {
  list: (organizationId: string, studentId: string) => apiClient.get<StudentNoteEntry[]>(`/organizations/${organizationId}/my-students/${studentId}/notes`),
  create: (organizationId: string, studentId: string, input: CreateStudentNoteInput) => apiClient.post<StudentNoteEntry>(`/organizations/${organizationId}/my-students/${studentId}/notes`, input),
}
