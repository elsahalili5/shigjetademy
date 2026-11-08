import { useQuery } from '@tanstack/react-query'
import { lessonPlansApi } from '../api/lesson-plans-api'
import type { PlanParams } from '../api/lesson-plans-api'
import { lessonPlansQueryKey } from './use-lesson-plan-sessions'

export const lessonPlanQueryKey = ({ organizationId, groupId, date, startTime }: PlanParams) => [...lessonPlansQueryKey(organizationId), 'plan', groupId, date, startTime] as const

/** One session's plan: its topic, what was covered, and whether covered may be set right now */
export function useLessonPlan(params: PlanParams) {
  return useQuery({ queryKey: lessonPlanQueryKey(params), queryFn: () => lessonPlansApi.plan(params) })
}
