import type { RosterEntry, StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { apiClient } from '#/api/client'

export const studentRosterApi = {
  list: (organizationId: string) => apiClient.get<RosterEntry[]>(`/organizations/${organizationId}/my-students`),
  get: (organizationId: string, studentId: string) => apiClient.get<StudentRosterDetail>(`/organizations/${organizationId}/my-students/${studentId}`),
}
