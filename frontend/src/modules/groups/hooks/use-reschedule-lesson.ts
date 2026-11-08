import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LessonRescheduleInput } from '@shigjetademy/shared/groups'
import { groupsApi } from '../api/groups-api'
import { lessonReschedulesQueryKey } from './use-lesson-reschedules'

type UseRescheduleLessonParams = {
  organizationId: string
  groupId: string
}

/** Moves one session of the group; its moved lessons load again */
export function useRescheduleLesson({ organizationId, groupId }: UseRescheduleLessonParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LessonRescheduleInput) => groupsApi.rescheduleLesson({ organizationId, groupId, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonReschedulesQueryKey({ organizationId, groupId }) }),
  })
}
