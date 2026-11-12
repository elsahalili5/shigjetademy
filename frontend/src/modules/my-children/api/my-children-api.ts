import { apiClient } from '#/api/client'
import type { MyChild, MyChildDetail } from '@shigjetademy/shared/guardians'
import type { MyChildNote, MyNote } from '@shigjetademy/shared/parent-notes'

export const myChildrenApi = {
  list: (organizationId: string) => apiClient.get<MyChild[]>(`/organizations/${organizationId}/me/children`),
  get: ({ organizationId, studentId }: { organizationId: string; studentId: string }) =>
    apiClient.get<MyChildDetail>(`/organizations/${organizationId}/me/children/${studentId}`),
  allNotes: (organizationId: string) => apiClient.get<MyNote[]>(`/organizations/${organizationId}/me/notes`),
  notes: ({ organizationId, studentId }: { organizationId: string; studentId: string }) =>
    apiClient.get<MyChildNote[]>(`/organizations/${organizationId}/me/children/${studentId}/notes`),
}
