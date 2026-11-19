import { useQuery } from '@tanstack/react-query'
import { gradesApi } from '../api/grades-api'
import { gradeQueryKeys } from '../utils/query-keys'

/** The student's own results in each of their groups */
export function useMyGrades(organizationId: string) {
  return useQuery({
    queryKey: gradeQueryKeys.mine(organizationId),
    queryFn: () => gradesApi.listMine(organizationId),
  })
}
