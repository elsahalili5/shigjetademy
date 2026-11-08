import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseLessonReschedulesParams = {
  organizationId: string
  groupId: string
}

export const lessonReschedulesQueryKey = ({ organizationId, groupId }: UseLessonReschedulesParams) => [...groupsQueryKey(organizationId), groupId, 'reschedules'] as const

/** The group's moved lessons, cancelled ones too, by the day they moved to */
export function useLessonReschedules(params: UseLessonReschedulesParams) {
  return useQuery({ queryKey: lessonReschedulesQueryKey(params), queryFn: () => groupsApi.reschedules(params) })
}
