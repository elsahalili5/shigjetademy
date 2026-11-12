import { useQuery } from '@tanstack/react-query'
import { parentNotesApi } from '../api/parent-notes-api'

type UseParentNoteThreadParams = {
  organizationId: string
  studentId: string
}

export const parentNoteThreadQueryKey = ({ organizationId, studentId }: UseParentNoteThreadParams) => ['organizations', organizationId, 'parent-notes', 'thread', studentId] as const

/** One student's guardians and every note the lecturer sent them */
export function useParentNoteThread({ organizationId, studentId }: UseParentNoteThreadParams) {
  return useQuery({ queryKey: parentNoteThreadQueryKey({ organizationId, studentId }), queryFn: () => parentNotesApi.thread({ organizationId, studentId }) })
}
