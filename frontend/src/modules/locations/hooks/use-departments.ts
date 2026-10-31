import { useQuery } from '@tanstack/react-query'
import { departmentsApi } from '../api/departments-api'

export const departmentsQueryKey = (organizationId: string) => ['organizations', organizationId, 'departments'] as const

export function useDepartments(organizationId: string) {
  return useQuery({ queryKey: departmentsQueryKey(organizationId), queryFn: () => departmentsApi.list(organizationId) })
}
