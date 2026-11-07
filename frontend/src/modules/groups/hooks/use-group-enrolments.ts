import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseGroupEnrolmentsParams = {
  organizationId: string
  groupId: string
}

/** The group's students, active and withdrawn, newest first */
export function useGroupEnrolments(params: UseGroupEnrolmentsParams) {
  return useQuery({ queryKey: [...groupsQueryKey(params.organizationId), params.groupId, 'enrolments'], queryFn: () => groupsApi.enrolments(params) })
}
