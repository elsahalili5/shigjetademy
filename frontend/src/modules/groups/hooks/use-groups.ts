import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import type { DefaultError, InfiniteData } from '@tanstack/react-query'
import { GROUP_PAGE_SIZE } from '@shigjetademy/shared/groups'
import type { GroupPage, GroupStatus } from '@shigjetademy/shared/groups'
import { groupsApi } from '../api/groups-api'

export const groupsQueryKey = (organizationId: string) => ['organizations', organizationId, 'groups'] as const

/** What the list shows: one status, and the chosen course and year ('' for any) */
type GroupFilters = {
  status: GroupStatus
  courseId: string
  yearId: string
}

type UseGroupsParams = GroupFilters & {
  organizationId: string
}

type GroupsQueryKey = readonly ['organizations', string, 'groups', 'list', GroupFilters]

const FIRST_PAGE = 1

/** Every loaded page's groups, with the counts from the newest page */
export type LoadedGroups = Omit<GroupPage, 'total'>

const getNextPage = (lastPage: GroupPage, pages: GroupPage[], lastPageParam: number) => {
  const loaded = pages.reduce((count, page) => count + page.groups.length, 0)
  return loaded < lastPage.total ? lastPageParam + 1 : undefined
}

const flattenPages = (data: InfiniteData<GroupPage, number>): LoadedGroups => ({
  groups: data.pages.flatMap((page) => page.groups),
  counts: data.pages.at(-1)?.counts ?? { ACTIVE: 0, ARCHIVED: 0 },
})

/** The organization's groups in one status, by course and name, matching the filters; fetchNextPage loads the next page */
export function useGroups({ organizationId, ...filters }: UseGroupsParams) {
  return useInfiniteQuery<GroupPage, DefaultError, LoadedGroups, GroupsQueryKey, number>({
    queryKey: [...groupsQueryKey(organizationId), 'list', filters],
    queryFn: ({ pageParam }) =>
      groupsApi.list({
        organizationId,
        status: filters.status,
        course_id: filters.courseId || undefined,
        academic_year_id: filters.yearId || undefined,
        page: pageParam,
        page_size: GROUP_PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: getNextPage,
    select: flattenPages,
    // Filtering or switching tabs keeps the current rows until the new ones arrive
    placeholderData: keepPreviousData,
  })
}
