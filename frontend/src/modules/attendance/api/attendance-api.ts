import { apiClient } from '#/api/client'
import type { AttendanceGroup, AttendanceMarkInput, AttendanceRegister, AttendanceStudent } from '@shigjetademy/shared/attendance'

type ListGroupsParams = {
  organizationId: string
  date: string
}

export type RegisterParams = {
  organizationId: string
  groupId: string
  date: string
}

type MarkStudentParams = RegisterParams &
  AttendanceMarkInput & {
    studentId: string
  }

const attendancePath = (organizationId: string) => `/organizations/${organizationId}/attendance`

const registerPath = ({ organizationId, groupId, date }: RegisterParams) => `${attendancePath(organizationId)}/groups/${groupId}/${date}`

export const attendanceApi = {
  groups: ({ organizationId, date }: ListGroupsParams) => apiClient.get<AttendanceGroup[]>(`${attendancePath(organizationId)}/groups`, { params: { date } }),
  register: (params: RegisterParams) => apiClient.get<AttendanceRegister>(registerPath(params)),
  markStudent: ({ studentId, status, ...params }: MarkStudentParams) => apiClient.put<AttendanceStudent, AttendanceMarkInput>(`${registerPath(params)}/students/${studentId}`, { status }),
  markAllPresent: (params: RegisterParams) => apiClient.put<AttendanceRegister>(`${registerPath(params)}/mark-all-present`),
}
