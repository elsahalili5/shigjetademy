import { useQuery } from '@tanstack/react-query'
import { testsApi } from '../api/tests-api'
import { testQueryKeys } from '../utils/query-keys'

/** The groups the member reaches; can_set marks where they may set tests */
export function useTestGroups(organizationId: string) {
  return useQuery({
    queryKey: testQueryKeys.groups(organizationId),
    queryFn: () => testsApi.listGroups(organizationId),
  })
}
