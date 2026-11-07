import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CourseInput } from '@shigjetademy/shared/courses'
import { groupsQueryKey } from '#/modules/groups/hooks/use-groups'
import { coursesApi } from '../api/courses-api'
import { coursesQueryKey } from './use-courses'

type SaveCourseParams = { kind: 'add'; input: CourseInput } | { kind: 'edit'; courseId: string; input: CourseInput }

/** Adds or edits a course; the list loads again, since its place and the counts may have changed, and so do groups, which show its name */
export function useSaveCourse(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveCourseParams) => {
      switch (params.kind) {
        case 'add':
          return coursesApi.create({ organizationId, ...params.input })
        case 'edit':
          return coursesApi.update({ organizationId, courseId: params.courseId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: coursesQueryKey(organizationId) }), queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) })]),
  })
}
