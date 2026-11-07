import { apiClient } from '#/api/client'
import type { Group, GroupInput, GroupLecturerHistory, GroupLecturerOption, GroupPage, GroupSubstitution, GroupSubstitutionInput, ListGroupsQuery } from '@shigjetademy/shared/groups'

type ListGroupsParams = ListGroupsQuery & {
  organizationId: string
}

type CreateGroupParams = GroupInput & {
  organizationId: string
}

type UpdateGroupParams = CreateGroupParams & {
  groupId: string
}

type GroupActionParams = {
  organizationId: string
  groupId: string
}

type AddSubstitutionParams = GroupActionParams & GroupSubstitutionInput

type SubstitutionActionParams = GroupActionParams & {
  substitutionId: string
}

type UpdateSubstitutionParams = SubstitutionActionParams & GroupSubstitutionInput

const groupsPath = (organizationId: string) => `/organizations/${organizationId}/groups`

const substitutionPath = ({ organizationId, groupId, substitutionId }: SubstitutionActionParams) => `${groupsPath(organizationId)}/${groupId}/substitutions/${substitutionId}`

export const groupsApi = {
  list: ({ organizationId, ...params }: ListGroupsParams) => apiClient.get<GroupPage>(groupsPath(organizationId), { params }),
  lecturerOptions: (organizationId: string) => apiClient.get<GroupLecturerOption[]>(`${groupsPath(organizationId)}/lecturer-options`),
  create: ({ organizationId, ...input }: CreateGroupParams) => apiClient.post<Group, GroupInput>(groupsPath(organizationId), input),
  update: ({ organizationId, groupId, ...input }: UpdateGroupParams) => apiClient.put<Group, GroupInput>(`${groupsPath(organizationId)}/${groupId}`, input),
  lecturers: ({ organizationId, groupId }: GroupActionParams) => apiClient.get<GroupLecturerHistory>(`${groupsPath(organizationId)}/${groupId}/lecturers`),
  addSubstitution: ({ organizationId, groupId, ...input }: AddSubstitutionParams) => apiClient.post<GroupSubstitution, GroupSubstitutionInput>(`${groupsPath(organizationId)}/${groupId}/substitutions`, input),
  updateSubstitution: ({ organizationId, groupId, substitutionId, ...input }: UpdateSubstitutionParams) =>
    apiClient.put<GroupSubstitution, GroupSubstitutionInput>(substitutionPath({ organizationId, groupId, substitutionId }), input),
  cancelSubstitution: (params: SubstitutionActionParams) => apiClient.post<GroupSubstitution>(`${substitutionPath(params)}/cancel`),
  archive: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/archive`),
  restore: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/restore`),
}
