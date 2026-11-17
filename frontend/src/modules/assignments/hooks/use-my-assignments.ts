import { useQuery } from '@tanstack/react-query'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

/** The student's assignments across all their groups, soonest due first, with their own hand-ins */
export function useMyAssignments(organizationId: string) {
  return useQuery({
    queryKey: assignmentQueryKeys.mine(organizationId),
    queryFn: () => assignmentsApi.listMine(organizationId),
  })
}
