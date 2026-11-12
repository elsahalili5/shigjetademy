import { useQuery } from '@tanstack/react-query'
import { myChildrenApi } from '../api/my-children-api'

/** Every note the school's lecturers sent about any of the guardian's children, newest first */
export function useMyNotes(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'notes'], queryFn: () => myChildrenApi.allNotes(organizationId) })
}
