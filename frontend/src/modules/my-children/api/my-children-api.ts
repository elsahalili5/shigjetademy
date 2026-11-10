import { apiClient } from '#/api/client'
import type { MyChild, MyChildDetail } from '@shigjetademy/shared/guardians'

export const myChildrenApi = {
  list: (organizationId: string) => apiClient.get<MyChild[]>(`/organizations/${organizationId}/me/children`),
  get: ({ organizationId, studentId }: { organizationId: string; studentId: string }) =>
    apiClient.get<MyChildDetail>(`/organizations/${organizationId}/me/children/${studentId}`),
}
