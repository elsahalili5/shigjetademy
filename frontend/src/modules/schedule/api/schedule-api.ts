import { apiClient } from '#/api/client'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'

export const scheduleApi = {
  get: (organizationId: string) => apiClient.get<WeeklyScheduleEntry[]>(`/organizations/${organizationId}/schedule`),
}
