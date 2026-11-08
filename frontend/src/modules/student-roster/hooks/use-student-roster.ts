import { useQuery } from '@tanstack/react-query'
import { studentRosterApi } from '../api/student-roster-api'

export function useStudentRoster(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'my-students'], queryFn: () => studentRosterApi.list(organizationId) })
}
