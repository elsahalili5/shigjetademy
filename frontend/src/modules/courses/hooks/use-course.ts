import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '../api/courses-api'
import { coursesQueryKey } from './use-courses'

type UseCourseParams = {
  organizationId: string
  courseId: string
}

/** One course with its groups, under the courses key, so saving any course loads it again */
export function useCourse({ organizationId, courseId }: UseCourseParams) {
  return useQuery({ queryKey: [...coursesQueryKey(organizationId), courseId, 'detail'], queryFn: () => coursesApi.get({ organizationId, courseId }) })
}
