import { apiClient } from '#/api/client'
import type { GradeOverview, GroupReport, StudentReport } from '@shigjetademy/shared/grades'

type OverviewParams = {
  organizationId: string
  /** Without one, the server picks the term that holds today */
  termId: string | null
}

type GroupReportParams = OverviewParams & {
  groupId: string
}

type StudentReportParams = OverviewParams & {
  studentId: string
}

const gradesPath = (organizationId: string) => `/organizations/${organizationId}/grades`

export const performanceApi = {
  getOverview: ({ organizationId, termId }: OverviewParams) => apiClient.get<GradeOverview>(`${gradesPath(organizationId)}/overview`, { params: { term_id: termId ?? undefined } }),
  getGroupReport: ({ organizationId, groupId, termId }: GroupReportParams) =>
    apiClient.get<GroupReport>(`${gradesPath(organizationId)}/overview/groups/${groupId}`, { params: { term_id: termId ?? undefined } }),
  getStudentReport: ({ organizationId, studentId, termId }: StudentReportParams) =>
    apiClient.get<StudentReport>(`${gradesPath(organizationId)}/students/${studentId}/report`, { params: { term_id: termId ?? undefined } }),
}
