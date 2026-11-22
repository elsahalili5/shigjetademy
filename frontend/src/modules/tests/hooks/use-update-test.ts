import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateTestInput } from '@shigjetademy/shared/tests'
import { testsApi } from '../api/tests-api'
import { recordTest } from '../utils/cache'

type UseUpdateTestParams = {
  organizationId: string
  testId: string
}

/** Saves a test's details and changes it in its group's cached list */
export function useUpdateTest({ organizationId, testId }: UseUpdateTestParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTestInput) => testsApi.update({ organizationId, testId, input }),
    onSuccess: (test) => recordTest({ queryClient, organizationId, test }),
  })
}
