import { useQuery } from '@tanstack/react-query'
import { roomsApi } from '../api/rooms-api'

export const roomsQueryKey = (organizationId: string) => ['organizations', organizationId, 'rooms'] as const

/** Every room across the organization's locations, for the group form's room picker */
export function useRooms(organizationId: string) {
  return useQuery({ queryKey: roomsQueryKey(organizationId), queryFn: () => roomsApi.list(organizationId) })
}
