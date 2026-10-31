import { apiClient } from '#/api/client'
import type { AcceptedInvitation, InvitationPreview } from '@shigjetademy/shared/invitations'

const invitationPath = (token: string) => `/invitations/${encodeURIComponent(token)}`

export const invitationsApi = {
  preview: (token: string) => apiClient.get<InvitationPreview>(invitationPath(token)),
  accept: (token: string) => apiClient.post<AcceptedInvitation>(`${invitationPath(token)}/accept`),
}
