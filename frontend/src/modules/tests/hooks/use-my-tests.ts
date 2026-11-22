import { useQuery } from '@tanstack/react-query'
import { testsApi } from '../api/tests-api'
import { testQueryKeys } from '../utils/query-keys'

/** The student's tests across all their groups, soonest first, with their own results */
export function useMyTests(organizationId: string) {
  return useQuery({
    queryKey: testQueryKeys.mine(organizationId),
    queryFn: () => testsApi.listMine(organizationId),
  })
}
