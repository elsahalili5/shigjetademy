import { apiClient } from '#/api/client'
import type { ActivityAction, ActivityEntry } from '@shigjetademy/shared/activity'

export type ActivityFilters = {
  organizationId?: string
  action?: ActivityAction
}

/** The oldest entry already loaded */
export type ActivityCursor = {
  before: string
  beforeId: string
}

type ListActivityParams = ActivityFilters & Partial<ActivityCursor>

export const activityApi = {
  list: (params: ListActivityParams) => apiClient.get<ActivityEntry[]>('/activity', { params }),
}
