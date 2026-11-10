import { useQuery } from '@tanstack/react-query'
import { roomsApi } from '../api/rooms-api'

export const locationRoomsQueryKey = (organizationId: string, locationId: string) => ['organizations', organizationId, 'locations', locationId, 'rooms'] as const

type UseLocationRoomsParams = {
  organizationId: string
  locationId: string
}

/** One location's own rooms, for the locations page */
export function useLocationRooms({ organizationId, locationId }: UseLocationRoomsParams) {
  return useQuery({ queryKey: locationRoomsQueryKey(organizationId, locationId), queryFn: () => roomsApi.listByLocation({ organizationId, locationId }) })
}
