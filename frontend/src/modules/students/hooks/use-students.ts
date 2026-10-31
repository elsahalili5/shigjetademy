import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import type { DefaultError, InfiniteData } from '@tanstack/react-query'
import { STUDENT_PAGE_SIZE } from '@shigjetademy/shared/students'
import type { StudentPage, StudentStatus } from '@shigjetademy/shared/students'
import { studentsApi } from '../api/students-api'

export const studentsQueryKey = (organizationId: string) => ['organizations', organizationId, 'students'] as const

type StudentFilters = {
  search: string
  status: StudentStatus
}

type UseStudentsParams = StudentFilters & {
  organizationId: string
}

type StudentsQueryKey = readonly ['organizations', string, 'students', StudentFilters]

const FIRST_PAGE = 1

/** Every loaded page's students, with the counts from the newest page */
export type LoadedStudents = Omit<StudentPage, 'total'>

const getNextPage = (lastPage: StudentPage, pages: StudentPage[], lastPageParam: number) => {
  const loaded = pages.reduce((count, page) => count + page.students.length, 0)
  return loaded < lastPage.total ? lastPageParam + 1 : undefined
}

const flattenPages = (data: InfiniteData<StudentPage, number>): LoadedStudents => ({
  students: data.pages.flatMap((page) => page.students),
  counts: data.pages.at(-1)?.counts ?? { ACTIVE: 0, ARCHIVED: 0 },
})

/** The organization's students in one status, by last name, matching the search; fetchNextPage loads the next page */
export function useStudents({ organizationId, search, status }: UseStudentsParams) {
  return useInfiniteQuery<StudentPage, DefaultError, LoadedStudents, StudentsQueryKey, number>({
    queryKey: [...studentsQueryKey(organizationId), { search, status }],
    queryFn: ({ pageParam }) => studentsApi.list({ organizationId, search, status, page: pageParam, page_size: STUDENT_PAGE_SIZE }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: getNextPage,
    select: flattenPages,
    // Typing a search or switching tabs keeps the current rows until the new ones arrive
    placeholderData: keepPreviousData,
  })
}
