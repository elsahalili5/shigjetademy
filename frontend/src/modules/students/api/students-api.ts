import { apiClient } from '#/api/client'
import type { InviteStudentInput } from '@shigjetademy/shared/invitations'
import type { CreateStudentInput, ListStudentsQuery, Student, StudentPage, UpdateStudentInput } from '@shigjetademy/shared/students'

type ListStudentsParams = ListStudentsQuery & {
  organizationId: string
}

type CreateStudentParams = CreateStudentInput & {
  organizationId: string
}

type UpdateStudentParams = UpdateStudentInput & {
  organizationId: string
  studentId: string
}

type StudentActionParams = {
  organizationId: string
  studentId: string
}

type InviteStudentParams = StudentActionParams & InviteStudentInput

const invitationPath = ({ organizationId, studentId }: StudentActionParams) => `/organizations/${organizationId}/students/${studentId}/invitation`

export const studentsApi = {
  list: ({ organizationId, ...params }: ListStudentsParams) => apiClient.get<StudentPage>(`/organizations/${organizationId}/students`, { params }),
  create: ({ organizationId, ...input }: CreateStudentParams) => apiClient.post<Student, CreateStudentInput>(`/organizations/${organizationId}/students`, input),
  update: ({ organizationId, studentId, ...input }: UpdateStudentParams) =>
    apiClient.put<Student, UpdateStudentInput>(`/organizations/${organizationId}/students/${studentId}`, input),
  archive: ({ organizationId, studentId }: StudentActionParams) => apiClient.post<Student>(`/organizations/${organizationId}/students/${studentId}/archive`),
  restore: ({ organizationId, studentId }: StudentActionParams) => apiClient.post<Student>(`/organizations/${organizationId}/students/${studentId}/restore`),
  // The invitation endpoints answer with the student, its login status updated
  invite: ({ organizationId, studentId, ...input }: InviteStudentParams) => apiClient.post<Student, InviteStudentInput>(invitationPath({ organizationId, studentId }), input),
  resendInvitation: (params: StudentActionParams) => apiClient.post<Student>(`${invitationPath(params)}/resend`),
  revokeInvitation: (params: StudentActionParams) => apiClient.delete<Student>(invitationPath(params)),
}
