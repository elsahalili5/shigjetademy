import { apiClient } from '#/api/client'
import type { ParentNote, ParentNoteConversation, ParentNoteGroup, ParentNoteInput, ParentNoteThread } from '@shigjetademy/shared/parent-notes'

type StudentParams = {
  organizationId: string
  studentId: string
}

const notesUrl = (organizationId: string) => `/organizations/${organizationId}/parent-notes`

export const parentNotesApi = {
  groups: (organizationId: string) => apiClient.get<ParentNoteGroup[]>(`${notesUrl(organizationId)}/groups`),
  conversations: (organizationId: string) => apiClient.get<ParentNoteConversation[]>(`${notesUrl(organizationId)}/conversations`),
  thread: ({ organizationId, studentId }: StudentParams) => apiClient.get<ParentNoteThread>(`${notesUrl(organizationId)}/students/${studentId}`),
  send: ({ organizationId, studentId, body }: StudentParams & ParentNoteInput) => apiClient.post<ParentNote, ParentNoteInput>(`${notesUrl(organizationId)}/students/${studentId}`, { body }),
}
