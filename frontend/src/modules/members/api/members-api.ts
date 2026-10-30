import { apiClient } from '#/api/client'
import type { OrganizationInvitation, OrganizationMember, UpdateMemberInput } from '@shigjetademy/shared/organization'

type MembershipParams = {
  organizationId: string
  membershipId: string
}

type UpdateMemberParams = MembershipParams & UpdateMemberInput

export const membersApi = {
  list: (organizationId: string) => apiClient.get<OrganizationMember[]>(`/organizations/${organizationId}/members`),
  pendingInvitations: (organizationId: string) => apiClient.get<OrganizationInvitation[]>(`/organizations/${organizationId}/invitations`),
  update: ({ organizationId, membershipId, ...input }: UpdateMemberParams) =>
    apiClient.patch<OrganizationMember, UpdateMemberInput>(`/organizations/${organizationId}/members/${membershipId}`, input),
  remove: ({ organizationId, membershipId }: MembershipParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/members/${membershipId}`),
}
