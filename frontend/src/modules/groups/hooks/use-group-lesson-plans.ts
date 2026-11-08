import { useQuery } from '@tanstack/react-query'
import { lessonPlansApi } from '#/modules/lessons/api/lesson-plans-api'
import { groupsQueryKey } from './use-groups'

type UseGroupLessonPlansParams = {
  organizationId: string
  groupId: string
}

export const groupLessonPlansQueryKey = ({ organizationId, groupId }: UseGroupLessonPlansParams) => [...groupsQueryKey(organizationId), groupId, 'lesson-plans'] as const

/** Every session of the group with a topic or covered note on record, under whichever day it now falls on */
export function useGroupLessonPlans(params: UseGroupLessonPlansParams) {
  return useQuery({ queryKey: groupLessonPlansQueryKey(params), queryFn: () => lessonPlansApi.groupPlans(params) })
}
