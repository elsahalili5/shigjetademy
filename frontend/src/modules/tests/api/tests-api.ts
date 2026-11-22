import { apiClient } from '#/api/client'
import type { CreateTestInput, RecordTestResultsInput, StudentTest, Test, TestGroup, TestSheet, UpdateTestInput } from '@shigjetademy/shared/tests'

type TestParams = {
  organizationId: string
  testId: string
}

type ListParams = {
  organizationId: string
  groupId: string
}

type CreateParams = {
  organizationId: string
  input: CreateTestInput
}

type UpdateParams = TestParams & {
  input: UpdateTestInput
}

type RecordParams = TestParams & {
  input: RecordTestResultsInput
}

const testsPath = (organizationId: string) => `/organizations/${organizationId}/tests`

const testPath = ({ organizationId, testId }: TestParams) => `${testsPath(organizationId)}/${testId}`

export const testsApi = {
  listGroups: (organizationId: string) => apiClient.get<TestGroup[]>(`${testsPath(organizationId)}/groups`),
  list: ({ organizationId, groupId }: ListParams) => apiClient.get<Test[]>(testsPath(organizationId), { params: { group_id: groupId } }),
  create: ({ organizationId, input }: CreateParams) => apiClient.post<Test, CreateTestInput>(testsPath(organizationId), input),
  update: ({ input, ...params }: UpdateParams) => apiClient.put<Test, UpdateTestInput>(testPath(params), input),
  remove: (params: TestParams) => apiClient.delete<{ id: string }>(testPath(params)),
  listMine: (organizationId: string) => apiClient.get<StudentTest[]>(`${testsPath(organizationId)}/mine`),
  get: (params: TestParams) => apiClient.get<TestSheet>(testPath(params)),
  recordResults: ({ input, ...params }: RecordParams) => apiClient.put<TestSheet, RecordTestResultsInput>(`${testPath(params)}/results`, input),
}
