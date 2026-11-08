import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LessonPlan } from '@shigjetademy/shared/lesson-plans'
import { lessonPlansApi } from '../api/lesson-plans-api'
import type { PlanParams } from '../api/lesson-plans-api'
import { lessonPlanQueryKey } from './use-lesson-plan'

/** Saves what was covered and writes it straight into the cached plan */
export function useSaveLessonPlanCovered(params: PlanParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (covered: string | null) => lessonPlansApi.saveCovered({ ...params, covered }),
    onSuccess: (saved) => queryClient.setQueryData<LessonPlan>(lessonPlanQueryKey(params), saved),
  })
}
