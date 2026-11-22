import { useQuery } from '@tanstack/react-query'
import { performanceApi } from '../api/performance-api'
import { performanceQueryKeys } from '../utils/query-keys'

type UseStudentReportParams = {
  organizationId: string
  studentId: string
  termId: string | null
}

/** One student's work and average in each of their groups the member reaches, for one term */
export function useStudentReport({ organizationId, studentId, termId }: UseStudentReportParams) {
  return useQuery({
    queryKey: performanceQueryKeys.studentReport({ organizationId, studentId, termId }),
    queryFn: () => performanceApi.getStudentReport({ organizationId, studentId, termId }),
  })
}
