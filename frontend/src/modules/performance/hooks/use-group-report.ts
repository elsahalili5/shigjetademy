import { useQuery } from '@tanstack/react-query'
import { performanceApi } from '../api/performance-api'
import { performanceQueryKeys } from '../utils/query-keys'

type UseGroupReportParams = {
  organizationId: string
  groupId: string
  termId: string | null
}

/** How each of one group's students did in one term */
export function useGroupReport({ organizationId, groupId, termId }: UseGroupReportParams) {
  return useQuery({
    queryKey: performanceQueryKeys.groupReport({ organizationId, groupId, termId }),
    queryFn: () => performanceApi.getGroupReport({ organizationId, groupId, termId }),
  })
}
