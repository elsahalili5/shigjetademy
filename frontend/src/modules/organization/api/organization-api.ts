import { apiClient } from '#/api/client'
import type {
  ClientOrganization,
  ClientOrganizationDetail,
  CreateOrganizationInput,
  OrganizationOverview,
  OrganizationStatus,
  PlatformStats,
  UpdateOrganizationStatusInput,
} from '@shigjetademy/shared/organization'

type UpdateStatusParams = {
  organizationId: string
  status: UpdateOrganizationStatusInput['status']
}

type CreatedOrganization = {
  id: string
  name: string
}

export const organizationApi = {
  create: (payload: CreateOrganizationInput) => apiClient.post<CreatedOrganization, CreateOrganizationInput>('/organizations', payload),
  list: () => apiClient.get<ClientOrganization[]>('/organizations'),
  stats: () => apiClient.get<PlatformStats>('/organizations/stats'),
  get: (organizationId: string) => apiClient.get<ClientOrganizationDetail>(`/organizations/${organizationId}`),
  overview: (organizationId: string) => apiClient.get<OrganizationOverview>(`/organizations/${organizationId}/overview`),
  updateStatus: ({ organizationId, status }: UpdateStatusParams) =>
    apiClient.patch<{ id: string; status: OrganizationStatus }, UpdateOrganizationStatusInput>(`/organizations/${organizationId}/status`, { status }),
}
