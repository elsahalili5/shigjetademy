import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationRoom } from '@shigjetademy/shared/rooms'
import { showErrorToast } from '#/lib/error-toast'
import { roomsApi } from '../api/rooms-api'
import { locationRoomsQueryKey } from './use-location-rooms'
import { roomsQueryKey } from './use-rooms'

export function useRemoveRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roomsApi.remove,
    onError: (error) => showErrorToast(error),
    onSuccess: (_, { organizationId, locationId, roomId }) => {
      queryClient.setQueryData<OrganizationRoom[]>(locationRoomsQueryKey(organizationId, locationId), (rooms) => rooms?.filter((room) => room.id !== roomId))
      void queryClient.invalidateQueries({ queryKey: roomsQueryKey(organizationId) })
    },
  })
}
