import { useQuery } from '@tanstack/react-query'
import { gradesApi } from '../api/grades-api'
import { gradeQueryKeys } from '../utils/query-keys'

type UseGradebookParams = {
  organizationId: string
  groupId: string
}

/** One group's students by its assignments with points */
export function useGradebook({ organizationId, groupId }: UseGradebookParams) {
  return useQuery({
    queryKey: gradeQueryKeys.gradebook({ organizationId, groupId }),
    queryFn: () => gradesApi.getGradebook({ organizationId, groupId }),
  })
}
