import { apiClient } from '#/api/client'
import type { InviteRecordInput } from '@shigjetademy/shared/invitations'
import type { Lecturer, LecturerInput, LecturerPage, ListLecturersQuery } from '@shigjetademy/shared/lecturers'

type ListLecturersParams = ListLecturersQuery & {
  organizationId: string
}

type CreateLecturerParams = LecturerInput & {
  organizationId: string
}

type UpdateLecturerParams = CreateLecturerParams & {
  lecturerId: string
}

type LecturerActionParams = {
  organizationId: string
  lecturerId: string
}

type InviteLecturerParams = LecturerActionParams & InviteRecordInput

const lecturersPath = (organizationId: string) => `/organizations/${organizationId}/lecturers`

const invitationPath = ({ organizationId, lecturerId }: LecturerActionParams) => `${lecturersPath(organizationId)}/${lecturerId}/invitation`

export const lecturersApi = {
  list: ({ organizationId, ...params }: ListLecturersParams) => apiClient.get<LecturerPage>(lecturersPath(organizationId), { params }),
  subjects: (organizationId: string) => apiClient.get<string[]>(`${lecturersPath(organizationId)}/subjects`),
  create: ({ organizationId, ...input }: CreateLecturerParams) => apiClient.post<Lecturer, LecturerInput>(lecturersPath(organizationId), input),
  update: ({ organizationId, lecturerId, ...input }: UpdateLecturerParams) => apiClient.put<Lecturer, LecturerInput>(`${lecturersPath(organizationId)}/${lecturerId}`, input),
  archive: ({ organizationId, lecturerId }: LecturerActionParams) => apiClient.post<Lecturer>(`${lecturersPath(organizationId)}/${lecturerId}/archive`),
  restore: ({ organizationId, lecturerId }: LecturerActionParams) => apiClient.post<Lecturer>(`${lecturersPath(organizationId)}/${lecturerId}/restore`),
  // The invitation endpoints answer with the lecturer, its login status updated
  invite: ({ organizationId, lecturerId, ...input }: InviteLecturerParams) => apiClient.post<Lecturer, InviteRecordInput>(invitationPath({ organizationId, lecturerId }), input),
  resendInvitation: (params: LecturerActionParams) => apiClient.post<Lecturer>(`${invitationPath(params)}/resend`),
  revokeInvitation: (params: LecturerActionParams) => apiClient.delete<Lecturer>(invitationPath(params)),
}
