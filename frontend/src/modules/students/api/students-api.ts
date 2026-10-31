import { apiClient } from '#/api/client'
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

export const studentsApi = {
  list: ({ organizationId, ...params }: ListStudentsParams) => apiClient.get<StudentPage>(`/organizations/${organizationId}/students`, { params }),
  create: ({ organizationId, ...input }: CreateStudentParams) => apiClient.post<Student, CreateStudentInput>(`/organizations/${organizationId}/students`, input),
  update: ({ organizationId, studentId, ...input }: UpdateStudentParams) =>
    apiClient.put<Student, UpdateStudentInput>(`/organizations/${organizationId}/students/${studentId}`, input),
  archive: ({ organizationId, studentId }: StudentActionParams) => apiClient.post<Student>(`/organizations/${organizationId}/students/${studentId}/archive`),
  restore: ({ organizationId, studentId }: StudentActionParams) => apiClient.post<Student>(`/organizations/${organizationId}/students/${studentId}/restore`),
}
