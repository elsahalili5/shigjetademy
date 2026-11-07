import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

/** The active lecturers the group and substitution forms offer */
export function useGroupLecturerOptions(organizationId: string) {
  return useQuery({ queryKey: [...groupsQueryKey(organizationId), 'lecturer-options'], queryFn: () => groupsApi.lecturerOptions(organizationId) })
}
