import { apiClient } from '#/api/client'
import type { InvitationLink, SentInvitation } from '@shigjetademy/shared/invitations'
import type { InviteMemberInput, OrganizationInvitation, OrganizationMember, UpdateMemberInput } from '@shigjetademy/shared/organization'

type MembershipParams = {
  organizationId: string
  membershipId: string
}

type UpdateMemberParams = MembershipParams & UpdateMemberInput

type InviteAdminParams = InviteMemberInput & {
  organizationId: string
}

type InvitationParams = {
  organizationId: string
  invitationId: string
}

export const membersApi = {
  list: (organizationId: string) => apiClient.get<OrganizationMember[]>(`/organizations/${organizationId}/members`),
  pendingInvitations: (organizationId: string) => apiClient.get<OrganizationInvitation[]>(`/organizations/${organizationId}/invitations`),
  update: ({ organizationId, membershipId, ...input }: UpdateMemberParams) =>
    apiClient.patch<OrganizationMember, UpdateMemberInput>(`/organizations/${organizationId}/members/${membershipId}`, input),
  remove: ({ organizationId, membershipId }: MembershipParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/members/${membershipId}`),
  invite: ({ organizationId, ...input }: InviteAdminParams) => apiClient.post<SentInvitation, InviteMemberInput>(`/organizations/${organizationId}/invitations`, input),
  resendInvitation: ({ organizationId, invitationId }: InvitationParams) => apiClient.post<SentInvitation>(`/organizations/${organizationId}/invitations/${invitationId}/resend`),
  /** A fresh link (emailed too) for the owner to copy; the old one stops working */
  renewInvitationLink: ({ organizationId, invitationId }: InvitationParams) => apiClient.post<InvitationLink>(`/organizations/${organizationId}/invitations/${invitationId}/link`),
  revokeInvitation: ({ organizationId, invitationId }: InvitationParams) => apiClient.delete<unknown>(`/organizations/${organizationId}/invitations/${invitationId}`),
}
