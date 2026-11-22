import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Test } from '@shigjetademy/shared/tests'
import { testsApi } from '../api/tests-api'
import { forgetTest } from '../utils/cache'

type UseRemoveTestParams = {
  organizationId: string
  test: Test
}

/** Removes a test with its results, and takes it off its group's cached list */
export function useRemoveTest({ organizationId, test }: UseRemoveTestParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => testsApi.remove({ organizationId, testId: test.id }),
    onSuccess: () => forgetTest({ queryClient, organizationId, test }),
  })
}
