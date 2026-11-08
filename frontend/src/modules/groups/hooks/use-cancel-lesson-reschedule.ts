import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { lessonReschedulesQueryKey } from './use-lesson-reschedules'

type UseCancelLessonRescheduleParams = {
  organizationId: string
  groupId: string
}

/** Cancels a move, which brings the original lesson back; the move stays on record */
export function useCancelLessonReschedule({ organizationId, groupId }: UseCancelLessonRescheduleParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rescheduleId: string) => groupsApi.cancelReschedule({ organizationId, groupId, rescheduleId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonReschedulesQueryKey({ organizationId, groupId }) }),
  })
}
