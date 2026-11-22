import { useQuery } from '@tanstack/react-query'
import { testsApi } from '../api/tests-api'
import { testQueryKeys } from '../utils/query-keys'

type UseTestSheetParams = {
  organizationId: string
  testId: string
}

/** A test with every student of its group and their result */
export function useTestSheet({ organizationId, testId }: UseTestSheetParams) {
  return useQuery({
    queryKey: testQueryKeys.sheet({ organizationId, testId }),
    queryFn: () => testsApi.get({ organizationId, testId }),
  })
}
