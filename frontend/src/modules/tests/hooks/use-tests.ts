import { useQuery } from '@tanstack/react-query'
import { testsApi } from '../api/tests-api'
import { testQueryKeys } from '../utils/query-keys'

type UseTestsParams = {
  organizationId: string
  groupId: string
}

/** One group's tests, soonest first */
export function useTests({ organizationId, groupId }: UseTestsParams) {
  return useQuery({
    queryKey: testQueryKeys.list({ organizationId, groupId }),
    queryFn: () => testsApi.list({ organizationId, groupId }),
  })
}
