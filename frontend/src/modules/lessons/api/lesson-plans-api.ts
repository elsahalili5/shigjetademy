import { apiClient } from '#/api/client'
import type { LessonPlan, LessonPlanCoveredInput, LessonPlanSession, LessonPlanTopicInput } from '@shigjetademy/shared/lesson-plans'

type ListSessionsParams = {
  organizationId: string
  date: string
}

type GroupPlansParams = {
  organizationId: string
  groupId: string
}

/** One session's plan: the group, the day and the session's start as 'HH:MM' */
export type PlanParams = GroupPlansParams & {
  date: string
  startTime: string
}

const groupPlansPath = ({ organizationId, groupId }: GroupPlansParams) => `/organizations/${organizationId}/groups/${groupId}/lesson-plans`

const planPath = ({ date, startTime, ...params }: PlanParams) => `${groupPlansPath(params)}/${date}/${startTime}`

export const lessonPlansApi = {
  sessions: ({ organizationId, date }: ListSessionsParams) => apiClient.get<LessonPlanSession[]>(`/organizations/${organizationId}/lesson-plans/sessions`, { params: { date } }),
  groupPlans: (params: GroupPlansParams) => apiClient.get<LessonPlan[]>(groupPlansPath(params)),
  plan: (params: PlanParams) => apiClient.get<LessonPlan>(planPath(params)),
  saveTopic: ({ topic, ...params }: PlanParams & LessonPlanTopicInput) => apiClient.put<LessonPlan, LessonPlanTopicInput>(`${planPath(params)}/topic`, { topic }),
  saveCovered: ({ covered, ...params }: PlanParams & LessonPlanCoveredInput) => apiClient.put<LessonPlan, LessonPlanCoveredInput>(`${planPath(params)}/covered`, { covered }),
}
