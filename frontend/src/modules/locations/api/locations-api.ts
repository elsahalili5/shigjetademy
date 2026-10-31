import { apiClient } from '#/api/client'
import type { LocationInput, OrganizationLocation } from '@shigjetademy/shared/location'

type CreateLocationParams = LocationInput & {
  organizationId: string
}

type UpdateLocationParams = CreateLocationParams & {
  locationId: string
}

type RemoveLocationParams = {
  organizationId: string
  locationId: string
  /** Required by the server when removing the main location while others remain */
  newMainId?: string
}

export const locationsApi = {
  list: (organizationId: string) => apiClient.get<OrganizationLocation[]>(`/organizations/${organizationId}/locations`),
  create: ({ organizationId, ...input }: CreateLocationParams) =>
    apiClient.post<OrganizationLocation, LocationInput>(`/organizations/${organizationId}/locations`, input),
  update: ({ organizationId, locationId, ...input }: UpdateLocationParams) =>
    apiClient.put<OrganizationLocation, LocationInput>(`/organizations/${organizationId}/locations/${locationId}`, input),
  remove: ({ organizationId, locationId, newMainId }: RemoveLocationParams) =>
    apiClient.delete<unknown>(`/organizations/${organizationId}/locations/${locationId}`, { params: { newMainId } }),
}
