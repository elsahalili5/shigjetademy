import { useQuery } from '@tanstack/react-query'
import { academicYearsApi } from '../api/academic-years-api'

export const academicYearsQueryKey = (organizationId: string) => ['organizations', organizationId, 'academic-years'] as const

export function useAcademicYears(organizationId: string) {
  return useQuery({ queryKey: academicYearsQueryKey(organizationId), queryFn: () => academicYearsApi.list(organizationId) })
}
