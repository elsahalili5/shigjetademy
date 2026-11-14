import { useQuery } from '@tanstack/react-query'
import { studentsApi } from '../api/students-api'

// Its own key, outside the students list's, so updates to the cached student pages never touch it
const studentGroupOptionsQueryKey = (organizationId: string) => ['organizations', organizationId, 'student-group-options'] as const

/** The organization's active groups, by course and name, for the students list's group filter */
export function useStudentGroupOptions(organizationId: string) {
  return useQuery({ queryKey: studentGroupOptionsQueryKey(organizationId), queryFn: () => studentsApi.groupOptions(organizationId) })
}
