import { apiClient } from '#/api/client'
import type { OrganizationInvitation, OrganizationMember, UpdateMemberAccessInput } from '@shigjetademy/shared/organization'

type MembershipParams = {
  organizationId: string
  membershipId: string
}

type UpdateAccessParams = MembershipParams & UpdateMemberAccessInput

export const membersApi = {
  list: (organizationId: string) => apiClient.get<OrganizationMember[]>(`/organizations/${organizationId}/members`),
  pendingInvitations: (organizationId: string) => apiClient.get<OrganizationInvitation[]>(`/organizations/${organizationId}/invitations`),
  updateAccess: ({ organizationId, membershipId, permissions }: UpdateAccessParams) =>
    apiClient.patch<OrganizationMember, UpdateMemberAccessInput>(`/organizations/${organizationId}/members/${membershipId}`, { permissions }),
  remove: ({ organizationId, membershipId }: MembershipParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/members/${membershipId}`),
}
