import { apiClient } from '#/api/client'
import type { Group, GroupInput, GroupPage, ListGroupsQuery } from '@shigjetademy/shared/groups'

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

const groupsPath = (organizationId: string) => `/organizations/${organizationId}/groups`

export const groupsApi = {
  list: ({ organizationId, ...params }: ListGroupsParams) => apiClient.get<GroupPage>(groupsPath(organizationId), { params }),
  create: ({ organizationId, ...input }: CreateGroupParams) => apiClient.post<Group, GroupInput>(groupsPath(organizationId), input),
  update: ({ organizationId, groupId, ...input }: UpdateGroupParams) => apiClient.put<Group, GroupInput>(`${groupsPath(organizationId)}/${groupId}`, input),
  archive: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/archive`),
  restore: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/restore`),
}
