import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { performanceApi } from '../api/performance-api'
import { performanceQueryKeys } from '../utils/query-keys'

type UseGradeOverviewParams = {
  organizationId: string
  termId: string | null
}

/** How each group the member reaches did in one term; the last term's numbers stay up while another loads */
export function useGradeOverview({ organizationId, termId }: UseGradeOverviewParams) {
  return useQuery({
    queryKey: performanceQueryKeys.overview({ organizationId, termId }),
    queryFn: () => performanceApi.getOverview({ organizationId, termId }),
    placeholderData: keepPreviousData,
  })
}
