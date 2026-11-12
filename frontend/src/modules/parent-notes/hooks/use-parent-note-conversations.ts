import { useQuery } from '@tanstack/react-query'
import { parentNotesApi } from '../api/parent-notes-api'

export const parentNoteConversationsQueryKey = (organizationId: string) => ['organizations', organizationId, 'parent-notes', 'conversations'] as const

/** The students the lecturer has written to, the latest note first */
export function useParentNoteConversations(organizationId: string) {
  return useQuery({ queryKey: parentNoteConversationsQueryKey(organizationId), queryFn: () => parentNotesApi.conversations(organizationId) })
}
