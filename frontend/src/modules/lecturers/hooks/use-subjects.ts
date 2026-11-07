import { useQuery } from '@tanstack/react-query'
import { lecturersApi } from '../api/lecturers-api'
import { lecturersQueryKey } from './use-lecturers'

/** The subjects the organization's lecturers already have, for suggestions and the subject filter */
export function useSubjects(organizationId: string) {
  return useQuery({ queryKey: [...lecturersQueryKey(organizationId), 'subjects'], queryFn: () => lecturersApi.subjects(organizationId) })
}
