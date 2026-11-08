import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LessonPlan } from '@shigjetademy/shared/lesson-plans'
import { lessonPlansApi } from '../api/lesson-plans-api'
import type { PlanParams } from '../api/lesson-plans-api'
import { lessonPlanQueryKey } from './use-lesson-plan'

/** Saves the planned topic and writes it straight into the cached plan */
export function useSaveLessonPlanTopic(params: PlanParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topic: string | null) => lessonPlansApi.saveTopic({ ...params, topic }),
    onSuccess: (saved) => queryClient.setQueryData<LessonPlan>(lessonPlanQueryKey(params), saved),
  })
}
