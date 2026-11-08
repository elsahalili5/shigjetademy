import { useQuery } from '@tanstack/react-query'
import { lessonPlansApi } from '../api/lesson-plans-api'

type UseLessonPlanSessionsParams = {
  organizationId: string
  /** '' while the date field is empty, which asks for nothing */
  date: string
}

export const lessonPlansQueryKey = (organizationId: string) => ['organizations', organizationId, 'lesson-plans'] as const

/** The lesson sessions on the day that this user may plan */
export function useLessonPlanSessions({ organizationId, date }: UseLessonPlanSessionsParams) {
  return useQuery({
    queryKey: [...lessonPlansQueryKey(organizationId), 'sessions', date],
    queryFn: () => lessonPlansApi.sessions({ organizationId, date }),
    enabled: !!date,
  })
}
