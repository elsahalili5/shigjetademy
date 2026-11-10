import { useQuery } from '@tanstack/react-query'
import { scheduleApi } from '../api/schedule-api'

export const weeklyScheduleQueryKey = (organizationId: string) => ['organizations', organizationId, 'schedule'] as const

export function useWeeklySchedule(organizationId: string) {
  return useQuery({ queryKey: weeklyScheduleQueryKey(organizationId), queryFn: () => scheduleApi.get(organizationId) })
}
