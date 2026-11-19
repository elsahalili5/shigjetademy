import { useQuery } from '@tanstack/react-query'
import { gradesApi } from '../api/grades-api'
import { gradeQueryKeys } from '../utils/query-keys'

/** The groups the member reads gradebooks for */
export function useGradeGroups(organizationId: string) {
  return useQuery({
    queryKey: gradeQueryKeys.groups(organizationId),
    queryFn: () => gradesApi.listGroups(organizationId),
  })
}
