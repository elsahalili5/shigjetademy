import { useQuery } from '@tanstack/react-query'
import { parentNotesApi } from '../api/parent-notes-api'

/** The groups the lecturer teaches now, each with its active students */
export function useParentNoteGroups(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'parent-notes', 'groups'], queryFn: () => parentNotesApi.groups(organizationId) })
}
