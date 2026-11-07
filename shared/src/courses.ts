// The course forms and the endpoints that store courses share these schemas.
import { z } from 'zod'
import { nameSchema } from './auth.ts'
import { optionalText } from './organization.ts'

export const COURSE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type CourseStatus = (typeof COURSE_STATUSES)[number]

const CODE_MAX = 30

const LEVEL_MAX = 60

const DESCRIPTION_MAX = 500

const SEARCH_MAX = 80

export const COURSE_PAGE_SIZE = 25

const COURSE_PAGE_SIZE_MAX = 100

/** A new course or an edit; optional text comes in as '' when left empty */
export const courseSchema = z.object({
  name: nameSchema('Enter the course name.'),
  code: optionalText(CODE_MAX),
  description: optionalText(DESCRIPTION_MAX),
  level: optionalText(LEVEL_MAX),
  department_id: z.uuid('Choose a department.').nullable(),
})

export type CourseInput = z.infer<typeof courseSchema>

export const listCoursesQuerySchema = z.object({
  /** Part of a name, a code or a level, in any case */
  search: z.string().trim().max(SEARCH_MAX).default(''),
  status: z.enum(COURSE_STATUSES, 'Unknown status').default('ACTIVE'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(COURSE_PAGE_SIZE_MAX).default(COURSE_PAGE_SIZE),
})

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>

export type Course = {
  id: string
  name: string
  code: string | null
  description: string | null
  level: string | null
  status: CourseStatus
  created_at: string
  department: { id: string; name: string } | null
}

/** What the group forms and filters offer: every course, by name, archived ones included */
export type CourseOption = Pick<Course, 'id' | 'name' | 'status'>

/** One page of courses in one status, with how many match the search in each status */
export type CoursePage = {
  courses: Course[]
  total: number
  counts: Record<CourseStatus, number>
}
