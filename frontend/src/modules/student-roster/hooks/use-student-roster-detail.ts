import { useQuery } from '@tanstack/react-query'
import { studentRosterApi } from '../api/student-roster-api'

type UseStudentRosterDetailParams = {
  organizationId: string
  studentId: string
}

export function useStudentRosterDetail({ organizationId, studentId }: UseStudentRosterDetailParams) {
  return useQuery({ queryKey: ['organizations', organizationId, 'my-students', studentId], queryFn: () => studentRosterApi.get(organizationId, studentId) })
}
