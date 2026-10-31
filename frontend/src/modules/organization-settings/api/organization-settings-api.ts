import { apiClient } from '#/api/client'
import type { OrganizationStatus } from '@shigjetademy/shared/organization'
import type {
  DeactivateOrganizationInput,
  OrganizationSettings,
  ReactivateOrganizationInput,
  TransferOwnershipInput,
  UpdateOrganizationSettingsInput,
} from '@shigjetademy/shared/organization-settings'

type UpdateSettingsParams = UpdateOrganizationSettingsInput & {
  organizationId: string
}

type TransferOwnershipParams = TransferOwnershipInput & {
  organizationId: string
}

type DeactivateParams = DeactivateOrganizationInput & {
  organizationId: string
}

type ReactivateParams = ReactivateOrganizationInput & {
  organizationId: string
}

type OrganizationStatusChange = {
  id: string
  status: OrganizationStatus
}

export const organizationSettingsApi = {
  get: (organizationId: string) => apiClient.get<OrganizationSettings>(`/organizations/${organizationId}/settings`),
  update: ({ organizationId, ...input }: UpdateSettingsParams) =>
    apiClient.put<OrganizationSettings, UpdateOrganizationSettingsInput>(`/organizations/${organizationId}/settings`, input),
  transferOwnership: ({ organizationId, ...input }: TransferOwnershipParams) =>
    apiClient.post<unknown, TransferOwnershipInput>(`/organizations/${organizationId}/settings/transfer-ownership`, input),
  deactivate: ({ organizationId, ...input }: DeactivateParams) =>
    apiClient.post<OrganizationStatusChange, DeactivateOrganizationInput>(`/organizations/${organizationId}/settings/deactivate`, input),
  reactivate: ({ organizationId, ...input }: ReactivateParams) =>
    apiClient.post<OrganizationStatusChange, ReactivateOrganizationInput>(`/organizations/${organizationId}/settings/reactivate`, input),
}
