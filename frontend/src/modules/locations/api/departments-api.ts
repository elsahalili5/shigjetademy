import { apiClient } from '#/api/client'
import type { DepartmentInput, OrganizationDepartment } from '@shigjetademy/shared/location'

type CreateDepartmentParams = DepartmentInput & {
  organizationId: string
}

type UpdateDepartmentParams = CreateDepartmentParams & {
  departmentId: string
}

type RemoveDepartmentParams = {
  organizationId: string
  departmentId: string
}

export const departmentsApi = {
  list: (organizationId: string) => apiClient.get<OrganizationDepartment[]>(`/organizations/${organizationId}/departments`),
  create: ({ organizationId, ...input }: CreateDepartmentParams) =>
    apiClient.post<OrganizationDepartment, DepartmentInput>(`/organizations/${organizationId}/departments`, input),
  update: ({ organizationId, departmentId, ...input }: UpdateDepartmentParams) =>
    apiClient.put<OrganizationDepartment, DepartmentInput>(`/organizations/${organizationId}/departments/${departmentId}`, input),
  remove: ({ organizationId, departmentId }: RemoveDepartmentParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/departments/${departmentId}`),
}
