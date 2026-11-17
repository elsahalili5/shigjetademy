import { useQuery } from '@tanstack/react-query'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

type UseAssignmentsParams = {
  organizationId: string
  groupId: string
}

/** One group's assignments, latest due first */
export function useAssignments({ organizationId, groupId }: UseAssignmentsParams) {
  return useQuery({
    queryKey: assignmentQueryKeys.list({ organizationId, groupId }),
    queryFn: () => assignmentsApi.list({ organizationId, groupId }),
  })
}
