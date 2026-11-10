import { useQuery } from '@tanstack/react-query'
import { guardiansApi } from '../api/guardians-api'

type UseStudentGuardiansParams = {
  organizationId: string
  studentId: string
}

export const studentGuardiansQueryKey = ({ organizationId, studentId }: UseStudentGuardiansParams) => ['organizations', organizationId, 'student-guardians', studentId] as const

/** The guardians linked to one student, by last name */
export function useStudentGuardians(params: UseStudentGuardiansParams) {
  return useQuery({ queryKey: studentGuardiansQueryKey(params), queryFn: () => guardiansApi.list(params) })
}
