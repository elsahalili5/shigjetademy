import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

/** The active students the enrol form offers */
export function useGroupStudentOptions(organizationId: string) {
  return useQuery({ queryKey: [...groupsQueryKey(organizationId), 'student-options'], queryFn: () => groupsApi.studentOptions(organizationId) })
}
