import { apiClient } from '#/api/client'
import type { AcademicYear, AcademicYearInput } from '@shigjetademy/shared/academic-periods'

const yearsPath = (organizationId: string) => `/organizations/${organizationId}/academic-periods/years`

type CreateYearParams = AcademicYearInput & {
  organizationId: string
}

type UpdateYearParams = CreateYearParams & {
  yearId: string
}

type RemoveYearParams = {
  organizationId: string
  yearId: string
  /** Required by the server when deleting the current year while others remain */
  newCurrentId?: string
}

export const academicYearsApi = {
  list: (organizationId: string) => apiClient.get<AcademicYear[]>(yearsPath(organizationId)),
  create: ({ organizationId, ...input }: CreateYearParams) => apiClient.post<AcademicYear, AcademicYearInput>(yearsPath(organizationId), input),
  update: ({ organizationId, yearId, ...input }: UpdateYearParams) => apiClient.put<AcademicYear, AcademicYearInput>(`${yearsPath(organizationId)}/${yearId}`, input),
  remove: ({ organizationId, yearId, newCurrentId }: RemoveYearParams) =>
    apiClient.delete<unknown>(`${yearsPath(organizationId)}/${yearId}`, { params: { newCurrentId } }),
}
