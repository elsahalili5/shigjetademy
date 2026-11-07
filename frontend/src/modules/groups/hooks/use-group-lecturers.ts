import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseGroupLecturersParams = {
  organizationId: string
  groupId: string
}

export const groupLecturersQueryKey = ({ organizationId, groupId }: UseGroupLecturersParams) => [...groupsQueryKey(organizationId), groupId, 'lecturers'] as const

/** Who has taught the group */
export function useGroupLecturers(params: UseGroupLecturersParams) {
  return useQuery({ queryKey: groupLecturersQueryKey(params), queryFn: () => groupsApi.lecturers(params) })
}
