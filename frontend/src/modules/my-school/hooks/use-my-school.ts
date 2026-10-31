import { useQuery } from '@tanstack/react-query'
import { mySchoolApi } from '../api/my-school-api'

export function useMySchool(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'student'], queryFn: () => mySchoolApi.get(organizationId) })
}
