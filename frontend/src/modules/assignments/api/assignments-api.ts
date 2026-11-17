import { apiClient } from '#/api/client'
import { downloadFile, uploadForm } from '#/api/files'
import type { Assignment, AssignmentDetail, AssignmentGroup, CreateAssignmentFields, GroupHandIn, HandInFields, MarkHandInInput, StudentAssignment, UpdateAssignmentFields } from '@shigjetademy/shared/assignments'

type AssignmentParams = {
  organizationId: string
  assignmentId: string
}

type ListParams = {
  organizationId: string
  groupId: string
}

type CreateParams = {
  organizationId: string
  fields: Required<CreateAssignmentFields>
  file: File | null
}

type UpdateParams = AssignmentParams & {
  fields: Required<UpdateAssignmentFields>
  file: File | null
}

type SubmissionParams = AssignmentParams & {
  submissionId: string
}

type MarkParams = SubmissionParams & {
  input: MarkHandInInput
}

type HandInParams = AssignmentParams & {
  fields: Required<HandInFields>
  file: File | null
}

const assignmentsPath = (organizationId: string) => `/organizations/${organizationId}/assignments`

const assignmentPath = ({ organizationId, assignmentId }: AssignmentParams) => `${assignmentsPath(organizationId)}/${assignmentId}`

// Setting and changing an assignment send a multipart form, with or without a file
export const assignmentsApi = {
  listGroups: (organizationId: string) => apiClient.get<AssignmentGroup[]>(`${assignmentsPath(organizationId)}/groups`),
  list: ({ organizationId, groupId }: ListParams) => apiClient.get<Assignment[]>(assignmentsPath(organizationId), { params: { group_id: groupId } }),
  create: ({ organizationId, fields, file }: CreateParams) => uploadForm<Assignment>({ url: assignmentsPath(organizationId), fields, file }),
  update: ({ fields, file, ...params }: UpdateParams) => uploadForm<Assignment>({ url: assignmentPath(params), fields, file, method: 'put' }),
  remove: (params: AssignmentParams) => apiClient.delete<{ id: string }>(assignmentPath(params)),
  download: (params: AssignmentParams) => downloadFile(`${assignmentPath(params)}/download`),
  listMine: (organizationId: string) => apiClient.get<StudentAssignment[]>(`${assignmentsPath(organizationId)}/mine`),
  get: (params: AssignmentParams) => apiClient.get<AssignmentDetail>(assignmentPath(params)),
  downloadHandIn: ({ submissionId, ...params }: SubmissionParams) => downloadFile(`${assignmentPath(params)}/submissions/${submissionId}/download`),
  mark: ({ submissionId, input, ...params }: MarkParams) => apiClient.put<GroupHandIn, MarkHandInInput>(`${assignmentPath(params)}/submissions/${submissionId}/mark`, input),
  handIn: ({ fields, file, ...params }: HandInParams) => uploadForm<StudentAssignment>({ url: `${assignmentPath(params)}/submission`, fields, file, method: 'put' }),
}
