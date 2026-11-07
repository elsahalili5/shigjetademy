import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '../api/courses-api'
import { coursesQueryKey } from './use-courses'

/** Every course of the organization, archived ones included, for the group forms and filters */
export function useCourseOptions(organizationId: string) {
  return useQuery({ queryKey: [...coursesQueryKey(organizationId), 'options'], queryFn: () => coursesApi.options(organizationId) })
}
