import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../api/attendance-api'

type UseAttendanceGroupsParams = {
  organizationId: string
  /** '' while the date field is empty, which asks for nothing */
  date: string
}

export const attendanceQueryKey = (organizationId: string) => ['organizations', organizationId, 'attendance'] as const

/** The groups with a lesson on the day that this user may open */
export function useAttendanceGroups({ organizationId, date }: UseAttendanceGroupsParams) {
  return useQuery({
    queryKey: [...attendanceQueryKey(organizationId), 'groups', date],
    queryFn: () => attendanceApi.groups({ organizationId, date }),
    enabled: !!date,
  })
}
