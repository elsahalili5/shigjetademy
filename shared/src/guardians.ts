// The guardian forms, the admin guardian endpoints and the guardian portal share these schemas and shapes.
// A guardian is a record the school keeps, like a lecturer: one per person in an organization, linked to any number of its students,
// with a login linked later by an invitation.
import { z } from 'zod'
import { emailSchema, nameSchema } from './auth.ts'
import type { RescheduledLesson } from './groups.ts'
import { optionalText } from './organization.ts'
import type { StudentAttendanceEntry, StudentAttendanceSummary } from './student-roster.ts'
import type { MySchoolGroup } from './students.ts'

/** How a guardian is related to one student; it belongs to the link, not the guardian */
export const GUARDIAN_RELATIONSHIPS = ['MOTHER', 'FATHER', 'LEGAL_GUARDIAN', 'GRANDPARENT', 'OTHER'] as const

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number]

const PHONE_MAX = 40

/** A new guardian for a student or an edit; the email is trimmed and lowercased, and optional text comes in as '' when left empty */
export const guardianSchema = z.object({
  first_name: nameSchema('Enter the first name.'),
  last_name: nameSchema('Enter the last name.'),
  email: z.union([z.literal(''), emailSchema]),
  phone: optionalText(PHONE_MAX),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS, 'Choose how they’re related.'),
})

export type GuardianInput = z.infer<typeof guardianSchema>

/** Whether a login is linked to the record: none, invited by email and waiting, or linked */
export type GuardianLoginStatus = 'NONE' | 'INVITED' | 'LINKED'

/** A guardian as staff see them */
export type Guardian = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  login_status: GuardianLoginStatus
  /** The pending invitation while login_status is INVITED, else null */
  invitation: { email: string; expires_at: string } | null
}

/** A guardian as listed on one student, with how they're related to that student */
export type StudentGuardian = Guardian & {
  relationship: GuardianRelationship
}

/** "Drita Gashi" */
export const getGuardianName = ({ first_name, last_name }: Pick<Guardian, 'first_name' | 'last_name'>) => `${first_name} ${last_name}`

/** One of a guardian's linked children, with nothing but their name */
export type MyChild = {
  id: string
  first_name: string
  last_name: string
}

/** What a guardian reads of one linked child: their current groups with the weekly schedule, lessons moved, and attendance; never notes or staff data */
export type MyChildDetail = {
  student: MyChild
  /** The active groups they are in now, in a school year that includes today, by name */
  groups: MySchoolGroup[]
  /** Lessons of those groups moved to today or later */
  rescheduled_lessons: RescheduledLesson[]
  /** Every mark in the organization, newest first */
  attendance: StudentAttendanceEntry[]
  summary: StudentAttendanceSummary
}
