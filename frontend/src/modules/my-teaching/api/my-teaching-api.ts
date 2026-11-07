import { apiClient } from '#/api/client'
import type { MyTeaching } from '@shigjetademy/shared/lecturers'

export const myTeachingApi = {
  get: (organizationId: string) => apiClient.get<MyTeaching>(`/organizations/${organizationId}/me/lecturer`),
}
