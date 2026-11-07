// The group forms and the endpoints that store groups share these schemas.
import { z } from 'zod'
import { nameSchema } from './auth.ts'
import { optionalText } from './organization.ts'
import type { CourseOption } from './courses.ts'
import type { Lecturer, LecturerStatus } from './lecturers.ts'

export const GROUP_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type GroupStatus = (typeof GROUP_STATUSES)[number]

const CAPACITY_MAX = 1000

export const GROUP_PAGE_SIZE = 25

const GROUP_PAGE_SIZE_MAX = 100

const SUBSTITUTION_NOTE_MAX = 500

/** A new group or an edit. The location stands in for a room; the capacity is stored, not enforced, until enrolment exists. */
export const groupSchema = z.object({
  course_id: z.uuid('Choose a course.'),
  name: nameSchema('Enter the group name.'),
  academic_year_id: z.uuid('Choose a school year.'),
  academic_term_id: z.uuid('Choose a term.').nullable(),
  location_id: z.uuid('Choose a location.').nullable(),
  capacity: z.number('Enter a whole number.').int('Enter a whole number.').min(1, 'Enter at least 1 seat.').max(CAPACITY_MAX, `Keep it to ${CAPACITY_MAX} seats.`).nullable(),
  /** The permanent lecturer; null for none */
  lecturer_id: z.uuid('Choose a lecturer.').nullable(),
  /** The day a change of lecturer starts, on an edit; null means no change, whatever lecturer_id says. A new group's lecturer starts today. */
  lecturer_effective_from: z.iso.date('Enter the date the change starts.').nullable(),
})

export type GroupInput = z.infer<typeof groupSchema>

/** Someone covering a group; one day when the dates are equal. The note comes in as '' when left empty. */
export const groupSubstitutionSchema = z
  .object({
    lecturer_id: z.uuid('Choose a lecturer.'),
    start_date: z.iso.date('Enter the start date.'),
    end_date: z.iso.date('Enter the end date.'),
    note: optionalText(SUBSTITUTION_NOTE_MAX),
  })
  .refine(({ start_date, end_date }) => end_date >= start_date, { path: ['end_date'], message: 'The end date can’t be before the start date.' })

export type GroupSubstitutionInput = z.infer<typeof groupSubstitutionSchema>

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

/** A lecturer as the groups pages name them */
export type GroupLecturer = Pick<Lecturer, 'id' | 'first_name' | 'last_name'> & {
  status: LecturerStatus
}

/** What the lecturer pickers offer: staff without MANAGE_LECTURERS read these too, so nothing else about the lecturer */
export type GroupLecturerOption = Pick<Lecturer, 'id' | 'first_name' | 'last_name' | 'subjects'>

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
  /** The permanent lecturer on the organization's today */
  lecturer: GroupLecturer | null
  /** The change still to come, with its first day; lecturer is null when the group is left without one */
  lecturer_change: { lecturer: GroupLecturer | null; start_date: string } | null
}

/** One permanent lecturer's stretch on a group; end_date is null while open */
export type GroupLecturerAssignment = {
  id: string
  lecturer: GroupLecturer
  start_date: string
  end_date: string | null
}

/** Someone covering a group; cancelled ones stay on record with cancelled_at set */
export type GroupSubstitution = {
  id: string
  lecturer: GroupLecturer
  start_date: string
  end_date: string
  note: string | null
  cancelled_at: string | null
}

/** Who has taught and covered a group, newest first */
export type GroupLecturerHistory = {
  assignments: GroupLecturerAssignment[]
  substitutions: GroupSubstitution[]
}

/** One page of groups in one status, with how many match the filters in each status */
export type GroupPage = {
  groups: Group[]
  total: number
  counts: Record<GroupStatus, number>
}
