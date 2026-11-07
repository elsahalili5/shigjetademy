import { apiClient } from '#/api/client'
import type { Course, CourseInput, CourseOption, CoursePage, ListCoursesQuery } from '@shigjetademy/shared/courses'

type ListCoursesParams = ListCoursesQuery & {
  organizationId: string
}

type CreateCourseParams = CourseInput & {
  organizationId: string
}

type UpdateCourseParams = CreateCourseParams & {
  courseId: string
}

type CourseActionParams = {
  organizationId: string
  courseId: string
}

const coursesPath = (organizationId: string) => `/organizations/${organizationId}/courses`

export const coursesApi = {
  list: ({ organizationId, ...params }: ListCoursesParams) => apiClient.get<CoursePage>(coursesPath(organizationId), { params }),
  options: (organizationId: string) => apiClient.get<CourseOption[]>(`${coursesPath(organizationId)}/options`),
  create: ({ organizationId, ...input }: CreateCourseParams) => apiClient.post<Course, CourseInput>(coursesPath(organizationId), input),
  update: ({ organizationId, courseId, ...input }: UpdateCourseParams) => apiClient.put<Course, CourseInput>(`${coursesPath(organizationId)}/${courseId}`, input),
  archive: ({ organizationId, courseId }: CourseActionParams) => apiClient.post<Course>(`${coursesPath(organizationId)}/${courseId}/archive`),
  restore: ({ organizationId, courseId }: CourseActionParams) => apiClient.post<Course>(`${coursesPath(organizationId)}/${courseId}/restore`),
}
