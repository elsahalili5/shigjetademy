import { apiClient } from '#/api/client'
import type { MySchool } from '@shigjetademy/shared/students'

export const mySchoolApi = {
  get: (organizationId: string) => apiClient.get<MySchool>(`/organizations/${organizationId}/me/student`),
}
