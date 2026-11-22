import type { QueryClient } from '@tanstack/react-query'
import type { Test, TestSheet } from '@shigjetademy/shared/tests'
import { testQueryKeys } from './query-keys'

type RecordTestParams = {
  queryClient: QueryClient
  organizationId: string
  test: Test
}

/** Soonest first, like the server lists them */
const byHeldAt = (first: Test, second: Test) => first.held_at.localeCompare(second.held_at) || first.title.localeCompare(second.title)

/** Puts a test the member just set or changed into its group's list, in date order, and into its open sheet, so nothing is fetched again */
export const recordTest = ({ queryClient, organizationId, test }: RecordTestParams) => {
  queryClient.setQueryData<Test[]>(testQueryKeys.list({ organizationId, groupId: test.group.id }), (tests = []) => [...tests.filter((item) => item.id !== test.id), test].sort(byHeldAt))
  queryClient.setQueryData<TestSheet>(testQueryKeys.sheet({ organizationId, testId: test.id }), (sheet) => (sheet ? { ...sheet, ...test } : sheet))
}

/** Takes a test the member just removed off its group's list */
export const forgetTest = ({ queryClient, organizationId, test }: RecordTestParams) => {
  queryClient.setQueryData<Test[]>(testQueryKeys.list({ organizationId, groupId: test.group.id }), (tests) => tests?.filter((item) => item.id !== test.id))
  queryClient.removeQueries({ queryKey: testQueryKeys.sheet({ organizationId, testId: test.id }) })
}
