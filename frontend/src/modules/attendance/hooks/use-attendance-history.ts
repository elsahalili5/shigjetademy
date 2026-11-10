import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../api/attendance-api'
import { attendanceQueryKey } from './use-attendance-sessions'

type UseAttendanceHistoryParams = {
  organizationId: string
}

/** The last 30 days' sessions with at least one saved mark, newest first, that this user may open */
export function useAttendanceHistory({ organizationId }: UseAttendanceHistoryParams) {
  return useQuery({
    queryKey: [...attendanceQueryKey(organizationId), 'history'],
    queryFn: () => attendanceApi.history({ organizationId }),
  })
}
