import { useQuery } from '@tanstack/react-query'
import { myChildrenApi } from '../api/my-children-api'

type UseMyChildGradesParams = {
  organizationId: string
  studentId: string
}

/** One linked child's own marks in each of their groups */
export function useMyChildGrades({ organizationId, studentId }: UseMyChildGradesParams) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'children', studentId, 'grades'], queryFn: () => myChildrenApi.grades({ organizationId, studentId }) })
}
