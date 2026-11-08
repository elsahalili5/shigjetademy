import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../api/attendance-api'

type UseAttendanceSessionsParams = {
  organizationId: string
  /** '' while the date field is empty, which asks for nothing */
  date: string
}

export const attendanceQueryKey = (organizationId: string) => ['organizations', organizationId, 'attendance'] as const

/** The lesson sessions on the day that this user may open */
export function useAttendanceSessions({ organizationId, date }: UseAttendanceSessionsParams) {
  return useQuery({
    queryKey: [...attendanceQueryKey(organizationId), 'sessions', date],
    queryFn: () => attendanceApi.sessions({ organizationId, date }),
    enabled: !!date,
  })
}
