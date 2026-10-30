import { useInfiniteQuery } from '@tanstack/react-query'
import type { DefaultError, InfiniteData } from '@tanstack/react-query'
import { ACTIVITY_PAGE_SIZE } from '@shigjetademy/shared/activity'
import type { ActivityEntry } from '@shigjetademy/shared/activity'
import { activityApi } from '../api/activity-api'
import type { ActivityCursor, ActivityFilters } from '../api/activity-api'

type ActivityPageParam = ActivityCursor | undefined

type ActivityQueryKey = readonly ['activity', ActivityFilters]

// A short page means the log has no older entries
const getNextCursor = (lastPage: ActivityEntry[]): ActivityPageParam => {
  const oldest = lastPage.at(-1)
  return lastPage.length === ACTIVITY_PAGE_SIZE && oldest ? { before: oldest.created_at, beforeId: oldest.id } : undefined
}

const flattenPages = (data: InfiniteData<ActivityEntry[], ActivityPageParam>) => data.pages.flat()

/** The activity log, newest first, for the platform admin; fetchNextPage loads older entries */
export function useActivity(filters: ActivityFilters) {
  return useInfiniteQuery<ActivityEntry[], DefaultError, ActivityEntry[], ActivityQueryKey, ActivityPageParam>({
    queryKey: ['activity', filters],
    queryFn: ({ pageParam }) => activityApi.list({ ...filters, ...pageParam }),
    initialPageParam: undefined,
    getNextPageParam: getNextCursor,
    select: flattenPages,
  })
}
