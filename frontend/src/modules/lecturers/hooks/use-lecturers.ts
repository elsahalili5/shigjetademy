import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import type { DefaultError, InfiniteData } from '@tanstack/react-query'
import { LECTURER_PAGE_SIZE } from '@shigjetademy/shared/lecturers'
import type { LecturerPage, LecturerStatus } from '@shigjetademy/shared/lecturers'
import { lecturersApi } from '../api/lecturers-api'

export const lecturersQueryKey = (organizationId: string) => ['organizations', organizationId, 'lecturers'] as const

/** What the list shows: one status, the search, and the chosen location, department and subject ('' for any) */
export type LecturerFilters = {
  search: string
  status: LecturerStatus
  locationId: string
  departmentId: string
  subject: string
}

type UseLecturersParams = LecturerFilters & {
  organizationId: string
}

type LecturersQueryKey = readonly ['organizations', string, 'lecturers', 'list', LecturerFilters]

const FIRST_PAGE = 1

/** Every loaded page's lecturers, with the counts from the newest page */
export type LoadedLecturers = Omit<LecturerPage, 'total'>

const getNextPage = (lastPage: LecturerPage, pages: LecturerPage[], lastPageParam: number) => {
  const loaded = pages.reduce((count, page) => count + page.lecturers.length, 0)
  return loaded < lastPage.total ? lastPageParam + 1 : undefined
}

const flattenPages = (data: InfiniteData<LecturerPage, number>): LoadedLecturers => ({
  lecturers: data.pages.flatMap((page) => page.lecturers),
  counts: data.pages.at(-1)?.counts ?? { ACTIVE: 0, ARCHIVED: 0 },
})

/** The organization's lecturers in one status, by last name, matching the search and filters; fetchNextPage loads the next page */
export function useLecturers({ organizationId, ...filters }: UseLecturersParams) {
  return useInfiniteQuery<LecturerPage, DefaultError, LoadedLecturers, LecturersQueryKey, number>({
    queryKey: [...lecturersQueryKey(organizationId), 'list', filters],
    queryFn: ({ pageParam }) =>
      lecturersApi.list({
        organizationId,
        search: filters.search,
        status: filters.status,
        location_id: filters.locationId || undefined,
        department_id: filters.departmentId || undefined,
        subject: filters.subject || undefined,
        page: pageParam,
        page_size: LECTURER_PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: getNextPage,
    select: flattenPages,
    // Typing a search, filtering or switching tabs keeps the current rows until the new ones arrive
    placeholderData: keepPreviousData,
  })
}
