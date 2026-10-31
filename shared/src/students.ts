// The student forms and the endpoints that store student records share these schemas.
// A student is a record the school keeps, not an account: no email, and no login until one is linked later.
import { z } from 'zod'
import { nameSchema } from './auth.ts'
import { todayDay } from './calendar-day.ts'
import { optionalText } from './organization.ts'

export const STUDENT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export const STUDENT_NUMBER_MAX = 30

const NOTES_MAX = 500

const SEARCH_MAX = 80

export const STUDENT_PAGE_SIZE = 25

const STUDENT_PAGE_SIZE_MAX = 100

const studentNumber = z.string().trim().max(STUDENT_NUMBER_MAX, `Keep the student number under ${STUDENT_NUMBER_MAX} characters.`)

const studentFields = {
  first_name: nameSchema('Enter the first name.'),
  last_name: nameSchema('Enter the last name.'),
  /** '' when the school doesn't know it */
  date_of_birth: z
    .union([z.literal(''), z.iso.date('Enter the date of birth.')])
    .refine((day) => day <= todayDay(), 'The date of birth can’t be in the future.'),
  enrolled_on: z.iso.date('Enter the enrolment date.'),
  notes: optionalText(NOTES_MAX),
}

type StudentDays = {
  date_of_birth: string
  enrolled_on: string
}

const enrolledAfterBirth = ({ date_of_birth, enrolled_on }: StudentDays) => !date_of_birth || enrolled_on >= date_of_birth

const ENROLLED_BEFORE_BIRTH = { path: ['enrolled_on'], message: 'The enrolment date can’t be before the date of birth.' }

/** A new student; an empty student number takes the organization's next one, like STU-0007 */
export const createStudentSchema = z.object({ ...studentFields, student_number: studentNumber }).refine(enrolledAfterBirth, ENROLLED_BEFORE_BIRTH)

export type CreateStudentInput = z.infer<typeof createStudentSchema>

export const updateStudentSchema = z
  .object({ ...studentFields, student_number: studentNumber.min(1, 'Enter the student number.') })
  .refine(enrolledAfterBirth, ENROLLED_BEFORE_BIRTH)

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

export const listStudentsQuerySchema = z.object({
  /** Part of a name or a student number, in any case */
  search: z.string().trim().max(SEARCH_MAX).default(''),
  status: z.enum(STUDENT_STATUSES, 'Unknown status').default('ACTIVE'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(STUDENT_PAGE_SIZE_MAX).default(STUDENT_PAGE_SIZE),
})

export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>

export type Student = {
  id: string
  first_name: string
  last_name: string
  /** A calendar day, or null when unknown */
  date_of_birth: string | null
  student_number: string
  enrolled_on: string
  status: StudentStatus
  notes: string | null
  created_at: string
}

/** "Arta Gashi" */
export const getStudentName = ({ first_name, last_name }: Pick<Student, 'first_name' | 'last_name'>) => `${first_name} ${last_name}`

/** One page of students in one status, with how many match the search in each status */
export type StudentPage = {
  students: Student[]
  total: number
  counts: Record<StudentStatus, number>
}
