import { useQuery } from '@tanstack/react-query'
import { assignmentsApi } from '../api/assignments-api'
import { assignmentQueryKeys } from '../utils/query-keys'

type UseAssignmentDetailParams = {
  organizationId: string
  assignmentId: string
}

/** An assignment with every student of its group and their hand-in */
export function useAssignmentDetail({ organizationId, assignmentId }: UseAssignmentDetailParams) {
  return useQuery({
    queryKey: assignmentQueryKeys.detail({ organizationId, assignmentId }),
    queryFn: () => assignmentsApi.get({ organizationId, assignmentId }),
  })
}
