import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import type { DefaultError, InfiniteData } from '@tanstack/react-query'
import { COURSE_PAGE_SIZE } from '@shigjetademy/shared/courses'
import type { CoursePage, CourseStatus } from '@shigjetademy/shared/courses'
import { coursesApi } from '../api/courses-api'

export const coursesQueryKey = (organizationId: string) => ['organizations', organizationId, 'courses'] as const

/** What the list shows: one status and the search */
type CourseFilters = {
  search: string
  status: CourseStatus
}

type UseCoursesParams = CourseFilters & {
  organizationId: string
}

type CoursesQueryKey = readonly ['organizations', string, 'courses', 'list', CourseFilters]

const FIRST_PAGE = 1

/** Every loaded page's courses, with the counts from the newest page */
export type LoadedCourses = Omit<CoursePage, 'total'>

const getNextPage = (lastPage: CoursePage, pages: CoursePage[], lastPageParam: number) => {
  const loaded = pages.reduce((count, page) => count + page.courses.length, 0)
  return loaded < lastPage.total ? lastPageParam + 1 : undefined
}

const flattenPages = (data: InfiniteData<CoursePage, number>): LoadedCourses => ({
  courses: data.pages.flatMap((page) => page.courses),
  counts: data.pages.at(-1)?.counts ?? { ACTIVE: 0, ARCHIVED: 0 },
})

/** The organization's courses in one status, by name, matching the search; fetchNextPage loads the next page */
export function useCourses({ organizationId, ...filters }: UseCoursesParams) {
  return useInfiniteQuery<CoursePage, DefaultError, LoadedCourses, CoursesQueryKey, number>({
    queryKey: [...coursesQueryKey(organizationId), 'list', filters],
    queryFn: ({ pageParam }) => coursesApi.list({ organizationId, search: filters.search, status: filters.status, page: pageParam, page_size: COURSE_PAGE_SIZE }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: getNextPage,
    select: flattenPages,
    // Typing a search or switching tabs keeps the current rows until the new ones arrive
    placeholderData: keepPreviousData,
  })
}
