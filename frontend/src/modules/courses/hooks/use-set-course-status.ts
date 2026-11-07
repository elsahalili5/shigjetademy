import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CourseStatus } from '@shigjetademy/shared/courses'
import { groupsQueryKey } from '#/modules/groups/hooks/use-groups'
import { coursesApi } from '../api/courses-api'
import { coursesQueryKey } from './use-courses'

type SetCourseStatusParams = {
  courseId: string
  status: CourseStatus
}

/** Archives a course or restores it; the course and its history stay either way. Groups load again, since archiving takes active ones along. */
export function useSetCourseStatus(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, status }: SetCourseStatusParams) => {
      switch (status) {
        case 'ARCHIVED':
          return coursesApi.archive({ organizationId, courseId })
        case 'ACTIVE':
          return coursesApi.restore({ organizationId, courseId })
        default: {
          const unknown: never = status
          throw new Error(`Unknown course status: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: coursesQueryKey(organizationId) }), queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) })]),
  })
}
