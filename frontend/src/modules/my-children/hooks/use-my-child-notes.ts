import { useQuery } from '@tanstack/react-query'
import { myChildrenApi } from '../api/my-children-api'

type UseMyChildNotesParams = {
  organizationId: string
  studentId: string
}

/** The notes the school's lecturers sent about one linked child, newest first */
export function useMyChildNotes({ organizationId, studentId }: UseMyChildNotesParams) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'children', studentId, 'notes'], queryFn: () => myChildrenApi.notes({ organizationId, studentId }) })
}
