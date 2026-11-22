import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTestInput } from '@shigjetademy/shared/tests'
import { testsApi } from '../api/tests-api'
import { recordTest } from '../utils/cache'

/** Sets a test and puts it into its group's cached list */
export function useSetTest(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTestInput) => testsApi.create({ organizationId, input }),
    onSuccess: (test) => recordTest({ queryClient, organizationId, test }),
  })
}
