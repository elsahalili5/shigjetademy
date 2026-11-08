import { apiClient } from '#/api/client'
import type { AttendanceMarkInput, AttendanceRegister, AttendanceSession, AttendanceStudent } from '@shigjetademy/shared/attendance'

type ListGroupsParams = {
  organizationId: string
  date: string
}

/** One session's register: the group, the day and the session's start as 'HH:MM' */
export type RegisterParams = {
  organizationId: string
  groupId: string
  date: string
  startTime: string
}

type MarkStudentParams = RegisterParams &
  AttendanceMarkInput & {
    studentId: string
  }

const attendancePath = (organizationId: string) => `/organizations/${organizationId}/attendance`

const registerPath = ({ organizationId, groupId, date, startTime }: RegisterParams) => `${attendancePath(organizationId)}/groups/${groupId}/${date}/${startTime}`

export const attendanceApi = {
  sessions: ({ organizationId, date }: ListGroupsParams) => apiClient.get<AttendanceSession[]>(`${attendancePath(organizationId)}/groups`, { params: { date } }),
  register: (params: RegisterParams) => apiClient.get<AttendanceRegister>(registerPath(params)),
  markStudent: ({ studentId, status, ...params }: MarkStudentParams) => apiClient.put<AttendanceStudent, AttendanceMarkInput>(`${registerPath(params)}/students/${studentId}`, { status }),
  markAllPresent: (params: RegisterParams) => apiClient.put<AttendanceRegister>(`${registerPath(params)}/mark-all-present`),
}
