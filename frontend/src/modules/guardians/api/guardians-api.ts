import { apiClient } from '#/api/client'
import type { Guardian, GuardianInput, StudentGuardian } from '@shigjetademy/shared/guardians'

type StudentGuardiansParams = {
  organizationId: string
  studentId: string
}

type AddGuardianParams = StudentGuardiansParams & GuardianInput

type StudentGuardianParams = StudentGuardiansParams & {
  guardianId: string
}

type UpdateGuardianParams = StudentGuardianParams & GuardianInput

type GuardianActionParams = {
  organizationId: string
  guardianId: string
}

const invitationPath = ({ organizationId, guardianId }: GuardianActionParams) => `/organizations/${organizationId}/guardians/${guardianId}/invitation`

const guardiansPath = ({ organizationId, studentId }: StudentGuardiansParams) => `/organizations/${organizationId}/students/${studentId}/guardians`

export const guardiansApi = {
  list: (params: StudentGuardiansParams) => apiClient.get<StudentGuardian[]>(guardiansPath(params)),
  add: ({ organizationId, studentId, ...input }: AddGuardianParams) => apiClient.post<StudentGuardian, GuardianInput>(guardiansPath({ organizationId, studentId }), input),
  update: ({ organizationId, studentId, guardianId, ...input }: UpdateGuardianParams) =>
    apiClient.put<StudentGuardian, GuardianInput>(`${guardiansPath({ organizationId, studentId })}/${guardianId}`, input),
  // The invitation endpoints answer with the guardian, its login status updated; they invite at the email on the record
  invite: (params: GuardianActionParams) => apiClient.post<Guardian>(invitationPath(params)),
  resendInvitation: (params: GuardianActionParams) => apiClient.post<Guardian>(`${invitationPath(params)}/resend`),
  revokeInvitation: (params: GuardianActionParams) => apiClient.delete<Guardian>(invitationPath(params)),
  unlink: ({ guardianId, ...params }: StudentGuardianParams) => apiClient.delete<void>(`${guardiansPath(params)}/${guardianId}`),
}
