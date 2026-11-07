import { useQuery } from '@tanstack/react-query'
import { myTeachingApi } from '../api/my-teaching-api'

export function useMyTeaching(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'lecturer'], queryFn: () => myTeachingApi.get(organizationId) })
}
