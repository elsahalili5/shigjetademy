// The group forms and the endpoints that store groups share these schemas.
import { z } from 'zod'
import { nameSchema } from './auth.ts'
import type { CourseOption } from './courses.ts'

export const GROUP_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type GroupStatus = (typeof GROUP_STATUSES)[number]

const CAPACITY_MAX = 1000

export const GROUP_PAGE_SIZE = 25

const GROUP_PAGE_SIZE_MAX = 100

/** A new group or an edit. The location stands in for a room; the capacity is stored, not enforced, until enrolment exists. */
export const groupSchema = z.object({
  course_id: z.uuid('Choose a course.'),
  name: nameSchema('Enter the group name.'),
  academic_year_id: z.uuid('Choose a school year.'),
  academic_term_id: z.uuid('Choose a term.').nullable(),
  location_id: z.uuid('Choose a location.').nullable(),
  capacity: z.number('Enter a whole number.').int('Enter a whole number.').min(1, 'Enter at least 1 seat.').max(CAPACITY_MAX, `Keep it to ${CAPACITY_MAX} seats.`).nullable(),
})

export type GroupInput = z.infer<typeof groupSchema>

export const listGroupsQuerySchema = z.object({
  status: z.enum(GROUP_STATUSES, 'Unknown status').default('ACTIVE'),
  course_id: z.uuid('Unknown course').optional(),
  academic_year_id: z.uuid('Unknown school year').optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(GROUP_PAGE_SIZE_MAX).default(GROUP_PAGE_SIZE),
})

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>

/** A record a group points to, by id and name */
type GroupRelation = {
  id: string
  name: string
}

export type Group = {
  id: string
  name: string
  capacity: number | null
  status: GroupStatus
  created_at: string
  course: CourseOption
  academic_year: GroupRelation
  academic_term: GroupRelation | null
  location: GroupRelation | null
}

/** One page of groups in one status, with how many match the filters in each status */
export type GroupPage = {
  groups: Group[]
  total: number
  counts: Record<GroupStatus, number>
}
