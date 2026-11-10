import { apiClient } from '#/api/client'
import type { GroupRoomOption, OrganizationRoom, RoomInput } from '@shigjetademy/shared/rooms'

type ListLocationRoomsParams = {
  organizationId: string
  locationId: string
}

type CreateRoomParams = ListLocationRoomsParams & RoomInput

type UpdateRoomParams = CreateRoomParams & {
  roomId: string
}

type RemoveRoomParams = ListLocationRoomsParams & {
  roomId: string
}

export const roomsApi = {
  /** Every room across the organization's locations, for the group form's room picker */
  list: (organizationId: string) => apiClient.get<GroupRoomOption[]>(`/organizations/${organizationId}/rooms`),
  listByLocation: ({ organizationId, locationId }: ListLocationRoomsParams) => apiClient.get<OrganizationRoom[]>(`/organizations/${organizationId}/locations/${locationId}/rooms`),
  create: ({ organizationId, locationId, ...input }: CreateRoomParams) =>
    apiClient.post<OrganizationRoom, RoomInput>(`/organizations/${organizationId}/locations/${locationId}/rooms`, input),
  update: ({ organizationId, locationId, roomId, ...input }: UpdateRoomParams) =>
    apiClient.put<OrganizationRoom, RoomInput>(`/organizations/${organizationId}/locations/${locationId}/rooms/${roomId}`, input),
  remove: ({ organizationId, locationId, roomId }: RemoveRoomParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/locations/${locationId}/rooms/${roomId}`),
}
