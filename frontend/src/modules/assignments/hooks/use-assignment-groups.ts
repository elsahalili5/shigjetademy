import { useQuery } from '@tanstack/react-query'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

/** The groups the member reaches; can_set marks where they may set assignments */
export function useAssignmentGroups(organizationId: string) {
  return useQuery({
    queryKey: assignmentQueryKeys.groups(organizationId),
    queryFn: () => assignmentsApi.listGroups(organizationId),
  })
}
