import { useQuery } from '@tanstack/react-query'
import { myChildrenApi } from '../api/my-children-api'

type UseMyChildParams = {
  organizationId: string
  studentId: string
}

/** One linked child's groups, schedule and attendance; a child who isn't theirs answers 404 */
export function useMyChild({ organizationId, studentId }: UseMyChildParams) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'children', studentId], queryFn: () => myChildrenApi.get({ organizationId, studentId }) })
}
