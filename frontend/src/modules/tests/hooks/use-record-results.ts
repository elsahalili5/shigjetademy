import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RecordTestResultsInput } from '@shigjetademy/shared/tests'
import { testsApi } from '../api/tests-api'
import { testQueryKeys } from '../utils/query-keys'

type UseRecordResultsParams = {
  organizationId: string
  testId: string
}

/** Saves the whole results sheet, and puts the saved sheet into the cache */
export function useRecordResults({ organizationId, testId }: UseRecordResultsParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordTestResultsInput) => testsApi.recordResults({ organizationId, testId, input }),
    onSuccess: (sheet) => queryClient.setQueryData(testQueryKeys.sheet({ organizationId, testId }), sheet),
  })
}
