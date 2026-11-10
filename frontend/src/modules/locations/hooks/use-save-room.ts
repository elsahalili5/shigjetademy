import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationRoom, RoomInput } from '@shigjetademy/shared/rooms'
import { roomsApi } from '../api/rooms-api'
import { withSavedRoom } from '../utils/room-cache'
import { locationRoomsQueryKey } from './use-location-rooms'
import { roomsQueryKey } from './use-rooms'

type SaveRoomParams = {
  organizationId: string
  locationId: string
  /** Absent when adding a new room */
  roomId?: string
  input: RoomInput
}

// Adds or edits a room; the saved one goes into the location's cached list, and the organization-wide list is invalidated for the group form's picker
export function useSaveRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ organizationId, locationId, roomId, input }: SaveRoomParams) =>
      roomId ? roomsApi.update({ organizationId, locationId, roomId, ...input }) : roomsApi.create({ organizationId, locationId, ...input }),
    onSuccess: (saved, { organizationId, locationId }) => {
      queryClient.setQueryData<OrganizationRoom[]>(locationRoomsQueryKey(organizationId, locationId), (rooms) => withSavedRoom({ rooms: rooms ?? [], saved }))
      void queryClient.invalidateQueries({ queryKey: roomsQueryKey(organizationId) })
    },
  })
}
