import { apiClient } from '#/api/client'
import type { Gradebook, GradeGroup, StudentGroupGrades } from '@shigjetademy/shared/grades'

type GradebookParams = {
  organizationId: string
  groupId: string
}

const gradesPath = (organizationId: string) => `/organizations/${organizationId}/grades`

export const gradesApi = {
  listGroups: (organizationId: string) => apiClient.get<GradeGroup[]>(`${gradesPath(organizationId)}/groups`),
  getGradebook: ({ organizationId, groupId }: GradebookParams) => apiClient.get<Gradebook>(gradesPath(organizationId), { params: { group_id: groupId } }),
  listMine: (organizationId: string) => apiClient.get<StudentGroupGrades[]>(`${gradesPath(organizationId)}/mine`),
}
