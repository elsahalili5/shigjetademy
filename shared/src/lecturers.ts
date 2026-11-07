// The lecturer forms and the endpoints that store lecturer records share these schemas.
// A lecturer is a record the school keeps, like a student: the login is optional and an invitation links it later.
import { z } from 'zod'
import type { CurrentPeriod } from './academic-periods.ts'
import { emailSchema, nameSchema } from './auth.ts'
import { optionalText } from './organization.ts'

export const LECTURER_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type LecturerStatus = (typeof LECTURER_STATUSES)[number]

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

const SUBJECT_MAX = 60

const SUBJECTS_MAX = 20

const LOCATIONS_MAX = 50

const NOTES_MAX = 500

const SEARCH_MAX = 80

export const LECTURER_PAGE_SIZE = 25

const LECTURER_PAGE_SIZE_MAX = 100

/** "  advanced   maths " as "advanced maths" */
export const tidySubject = (subject: string) => subject.trim().replace(/\s+/g, ' ')

/** Tidied, without empty ones, and once each whatever the case, keeping the first casing typed */
export const normalizeSubjects = (subjects: string[]) => {
  const seen = new Set<string>()
  return subjects.map(tidySubject).filter((subject) => {
    const key = subject.toLowerCase()
    if (!subject || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const subjectsSchema = z
  .array(z.string())
  .transform(normalizeSubjects)
  .pipe(
    z
      .array(z.string().max(SUBJECT_MAX, `Keep each subject under ${SUBJECT_MAX} characters.`))
      .max(SUBJECTS_MAX, `Add at most ${SUBJECTS_MAX} subjects.`),
  )

/** A new lecturer or an edit; optional text comes in as '' when left empty */
export const lecturerSchema = z.object({
  first_name: nameSchema('Enter the first name.'),
  last_name: nameSchema('Enter the last name.'),
  email: z.union([z.literal(''), emailSchema]),
  phone: optionalText(40),
  subjects: subjectsSchema,
  employment_type: z.enum(EMPLOYMENT_TYPES, 'Choose the employment type.'),
  /** '' when the school doesn't record it */
  started_on: z.union([z.literal(''), z.iso.date('Enter the start date.')]),
  notes: optionalText(NOTES_MAX),
  department_id: z.uuid('Choose a department.').nullable(),
  location_ids: z
    .array(z.uuid('Choose one of your locations.'))
    .max(LOCATIONS_MAX)
    .transform((ids) => [...new Set(ids)]),
})

export type LecturerInput = z.infer<typeof lecturerSchema>

export const listLecturersQuerySchema = z.object({
  /** Part of a name, a subject or an email, in any case */
  search: z.string().trim().max(SEARCH_MAX).default(''),
  status: z.enum(LECTURER_STATUSES, 'Unknown status').default('ACTIVE'),
  location_id: z.uuid('Unknown location').optional(),
  department_id: z.uuid('Unknown department').optional(),
  /** One subject, in any case */
  subject: z.string().trim().max(SUBJECT_MAX).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(LECTURER_PAGE_SIZE_MAX).default(LECTURER_PAGE_SIZE),
})

export type ListLecturersQuery = z.infer<typeof listLecturersQuerySchema>

/** Whether a login is linked to the record: none, invited by email and waiting, or linked */
export type LecturerLoginStatus = 'NONE' | 'INVITED' | 'LINKED'

export type LecturerPlace = {
  id: string
  name: string
}

export type Lecturer = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  subjects: string[]
  employment_type: EmploymentType
  /** A calendar day, or null when not recorded */
  started_on: string | null
  notes: string | null
  status: LecturerStatus
  created_at: string
  department: LecturerPlace | null
  /** By name */
  locations: LecturerPlace[]
  login_status: LecturerLoginStatus
  /** The pending invitation while login_status is INVITED, else null */
  invitation: { email: string; expires_at: string } | null
}

/** "Arben Hoxha" */
export const getLecturerName = ({ first_name, last_name }: Pick<Lecturer, 'first_name' | 'last_name'>) => `${first_name} ${last_name}`

/** One page of lecturers in one status, with how many match the search and filters in each status */
export type LecturerPage = {
  lecturers: Lecturer[]
  total: number
  counts: Record<LecturerStatus, number>
}

/** A group as its lecturer reads it */
export type MyTeachingGroup = {
  id: string
  name: string
  course: string
  academic_year: string
  location: string | null
}

/** A substitution a lecturer covers, running now or still to come; the staff note stays out */
export type MyTeachingCover = {
  id: string
  status: 'CURRENT' | 'UPCOMING'
  start_date: string
  end_date: string
  group: MyTeachingGroup
}

/** What a lecturer sees of their organization: their own record only, the current school year and term, and what they teach */
export type MyTeaching = {
  organization: { id: string; name: string }
  /** Null while no record is linked to their login */
  lecturer: {
    first_name: string
    last_name: string
    subjects: string[]
    employment_type: EmploymentType
    department: string | null
    locations: string[]
  } | null
  academic_year: CurrentPeriod | null
  /** The term today falls in; null between terms */
  term: CurrentPeriod | null
  /** The holiday or break covering today, if any */
  holiday: { name: string } | null
  /** The current year's next term that hasn't started yet */
  next_term: CurrentPeriod | null
  /** The active groups they permanently teach today, in a school year that includes today, by name */
  groups: MyTeachingGroup[]
  /** Soonest first */
  cover: MyTeachingCover[]
}
