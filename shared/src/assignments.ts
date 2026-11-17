// Assignments: homework a group's lecturers set, its students hand in and the lecturers mark. The forms and the endpoints share these schemas and response shapes.
// Assignments are sent as multipart forms with an optional file, so their fields arrive as text.
import { z } from 'zod'

export const ASSIGNMENT_TITLE_MAX_LENGTH = 150

export const ASSIGNMENT_INSTRUCTIONS_MAX_LENGTH = 10000

/** The most points an assignment can be out of */
export const ASSIGNMENT_MAX_POINTS = 1000

const titleSchema = z.string().trim().min(1, 'Write a title.').max(ASSIGNMENT_TITLE_MAX_LENGTH, `Keep the title under ${ASSIGNMENT_TITLE_MAX_LENGTH} characters.`)

const instructionsSchema = z
  .string()
  .trim()
  .min(1, 'Write the instructions.')
  .max(ASSIGNMENT_INSTRUCTIONS_MAX_LENGTH, `Keep the instructions under ${ASSIGNMENT_INSTRUCTIONS_MAX_LENGTH} characters.`)

/** An ISO timestamp in UTC, like 2026-11-20T16:00:00.000Z */
const dueAtSchema = z.iso.datetime({ error: 'Choose a due date and time.' })

/** Whole points, as forms send them */
export const WHOLE_NUMBER = /^\d+$/

/** Text, since forms send it as text: empty for none, otherwise whole points from 1 to the most allowed */
export const maxPointsFieldSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || WHOLE_NUMBER.test(value), 'Enter whole points, like 20.')
  .transform((value) => (value === '' ? null : Number(value)))
  .pipe(z.number().int().min(1, 'Points must be at least 1.').max(ASSIGNMENT_MAX_POINTS, `Points can be at most ${ASSIGNMENT_MAX_POINTS}.`).nullable())

const FLAG_VALUES = ['true', 'false'] as const

/** A yes or no sent as form text */
const flagFieldSchema = (fallback: (typeof FLAG_VALUES)[number]) =>
  z
    .enum(FLAG_VALUES)
    .default(fallback)
    .transform((value) => value === 'true')

/** What every assignment has, and what can change after it is set. Late hand-ins are accepted unless the setter turns them off. */
export const assignmentDetailsSchema = z.object({
  title: titleSchema,
  instructions: instructionsSchema,
  due_at: dueAtSchema,
  max_points: maxPointsFieldSchema,
  accepts_late_hand_ins: flagFieldSchema('true'),
})

/** The fields sent to set an assignment, beside its optional file */
export const createAssignmentSchema = assignmentDetailsSchema.extend({
  group_id: z.uuid('Choose a group.'),
})

/** What the form sends to set an assignment: all text */
export type CreateAssignmentFields = z.input<typeof createAssignmentSchema>

export type CreateAssignmentInput = z.output<typeof createAssignmentSchema>

/** The fields sent to change an assignment, beside an optional new file; its group stays. remove_file takes its file away when no new one is sent. */
export const updateAssignmentSchema = assignmentDetailsSchema.extend({
  remove_file: flagFieldSchema('false'),
})

export type UpdateAssignmentFields = z.input<typeof updateAssignmentSchema>

export type UpdateAssignmentInput = z.output<typeof updateAssignmentSchema>

export const HAND_IN_TEXT_MAX_LENGTH = 10000

/** A student's hand-in: text, a file or both. keep_file keeps the file handed in before when no new one is sent. */
export const handInSchema = z.object({
  text: z.string().trim().max(HAND_IN_TEXT_MAX_LENGTH, `Keep your answer under ${HAND_IN_TEXT_MAX_LENGTH} characters.`),
  keep_file: flagFieldSchema('false'),
})

export type HandInFields = z.input<typeof handInSchema>

export type HandInInput = z.output<typeof handInSchema>

export const FEEDBACK_MAX_LENGTH = 5000

/** A lecturer's mark: points out of the max, or none when the assignment has no max points, and written feedback (empty for none) */
export const markHandInSchema = z.object({
  points: z.number('Enter whole points.').int('Enter whole points.').min(0, 'Points can’t be below 0.').max(ASSIGNMENT_MAX_POINTS, `Points can be at most ${ASSIGNMENT_MAX_POINTS}.`).nullable(),
  feedback: z.string().trim().max(FEEDBACK_MAX_LENGTH, `Keep the feedback under ${FEEDBACK_MAX_LENGTH} characters.`),
})

export type MarkHandInInput = z.infer<typeof markHandInSchema>

export const assignmentGroupQuerySchema = z.object({
  group_id: z.uuid('Choose a group.'),
})

export type AssignmentGroupQuery = z.infer<typeof assignmentGroupQuerySchema>

/** A group the viewer reaches; can_set says whether they may set assignments there now */
export type AssignmentGroup = {
  id: string
  name: string
  course_name: string
  is_archived: boolean
  can_set: boolean
}

/** An uploaded file: the name it was uploaded with, its type and its size in bytes */
export type AssignmentFile = {
  name: string
  type: string
  size: number
}

export type AssignmentAuthor = {
  membership_id: string
  first_name: string
  last_name: string
}

/** One assignment. Dates are ISO timestamps in UTC. */
export type Assignment = {
  id: string
  group: Pick<AssignmentGroup, 'id' | 'name' | 'course_name'>
  title: string
  instructions: string
  due_at: string
  max_points: number | null
  /** When false, hand-ins close at the due date */
  accepts_late_hand_ins: boolean
  file: AssignmentFile | null
  author: AssignmentAuthor
  created_at: string
  updated_at: string
  /** The group's lecturers, the owner and admins with Grades change and remove it, until the group is archived */
  can_edit: boolean
  can_remove: boolean
}

/** Where a student's hand-in stands: late is handed in after the due date and not marked yet */
export type HandInStatus = 'NOT_HANDED_IN' | 'HANDED_IN' | 'LATE' | 'MARKED'

/** The lecturer's mark: points when the assignment has max points, and written feedback */
export type HandInMark = {
  points: number | null
  feedback: string | null
  marked_at: string
}

/** One student's hand-in. is_late says it was handed in after the due date. */
export type AssignmentHandIn = {
  id: string
  text: string | null
  file: AssignmentFile | null
  submitted_at: string
  is_late: boolean
  mark: HandInMark | null
}

/** An assignment as its student sees it, with their own hand-in */
export type StudentAssignment = Assignment & {
  status: HandInStatus
  hand_in: AssignmentHandIn | null
  /** Past the due date, with late hand-ins turned off */
  is_closed: boolean
  /** Until it is marked or closed, while the group is not archived */
  can_hand_in: boolean
}

export type HandInStudent = {
  id: string
  first_name: string
  last_name: string
  student_number: string
}

/** One student of the group and where their hand-in stands */
export type GroupHandIn = {
  student: HandInStudent
  status: HandInStatus
  hand_in: AssignmentHandIn | null
}

/** An assignment as its setters see it: every actively enrolled student of the group, by name */
export type AssignmentDetail = Assignment & {
  hand_ins: GroupHandIn[]
}
