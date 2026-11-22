// Tests: paper or in-class tests a group's lecturers set, then record each student's result for. The forms and the endpoints share these schemas and response shapes.
import { z } from 'zod'

export const TEST_TITLE_MAX_LENGTH = 150

export const TEST_DESCRIPTION_MAX_LENGTH = 5000

/** The most points a test can be out of */
export const TEST_MAX_POINTS = 1000

export const TEST_FEEDBACK_MAX_LENGTH = 2000

/** What every test has, and what can change after it is set. An empty description is none. */
export const testDetailsSchema = z.object({
  title: z.string().trim().min(1, 'Write a title.').max(TEST_TITLE_MAX_LENGTH, `Keep the title under ${TEST_TITLE_MAX_LENGTH} characters.`),
  description: z.string().trim().max(TEST_DESCRIPTION_MAX_LENGTH, `Keep the description under ${TEST_DESCRIPTION_MAX_LENGTH} characters.`),
  /** An ISO timestamp in UTC, like 2026-11-20T09:00:00.000Z */
  held_at: z.iso.datetime({ error: 'Choose the day and time of the test.' }),
  max_points: z.number('Enter whole points, like 20.').int('Enter whole points, like 20.').min(1, 'Points must be at least 1.').max(TEST_MAX_POINTS, `Points can be at most ${TEST_MAX_POINTS}.`),
})

export const createTestSchema = testDetailsSchema.extend({
  group_id: z.uuid('Choose a group.'),
})

export type CreateTestInput = z.infer<typeof createTestSchema>

/** A test's group stays */
export const updateTestSchema = testDetailsSchema

export type UpdateTestInput = z.infer<typeof updateTestSchema>

export const testGroupQuerySchema = z.object({
  group_id: z.uuid('Choose a group.'),
})

export type TestGroupQuery = z.infer<typeof testGroupQuerySchema>

/** One student's line on the results sheet: points, or absent with none, or neither to leave them without a result; a note only beside a result */
export const testResultEntrySchema = z
  .object({
    student_id: z.uuid('Choose a student.'),
    points: z.number('Enter whole points.').int('Enter whole points.').min(0, 'Points can’t be below 0.').max(TEST_MAX_POINTS, `Points can be at most ${TEST_MAX_POINTS}.`).nullable(),
    is_absent: z.boolean(),
    feedback: z.string().trim().max(TEST_FEEDBACK_MAX_LENGTH, `Keep the note under ${TEST_FEEDBACK_MAX_LENGTH} characters.`),
  })
  .superRefine((entry, context) => {
    if (entry.is_absent && entry.points !== null) context.addIssue({ code: 'custom', path: ['points'], message: 'An absent student has no points.' })
    if (!entry.is_absent && entry.points === null && entry.feedback) context.addIssue({ code: 'custom', path: ['points'], message: 'Give points or mark the student absent.' })
  })

export type TestResultEntry = z.infer<typeof testResultEntrySchema>

/** The whole results sheet, saved at once; each student at most once */
export const recordTestResultsSchema = z.object({
  results: z.array(testResultEntrySchema).refine((entries) => new Set(entries.map((entry) => entry.student_id)).size === entries.length, 'Each student can be on the sheet only once.'),
})

export type RecordTestResultsInput = z.infer<typeof recordTestResultsSchema>

/** A group the viewer reaches; can_set says whether they may set tests there now */
export type TestGroup = {
  id: string
  name: string
  course_name: string
  is_archived: boolean
  can_set: boolean
}

export type TestAuthor = {
  membership_id: string
  first_name: string
  last_name: string
}

/** One test. Dates are ISO timestamps in UTC. */
export type Test = {
  id: string
  group: Pick<TestGroup, 'id' | 'name' | 'course_name'>
  title: string
  description: string | null
  held_at: string
  max_points: number
  author: TestAuthor
  created_at: string
  updated_at: string
  /** The group's lecturers, the owner and admins with Tests change and remove it and record its results, until the group is archived */
  can_edit: boolean
  can_remove: boolean
}

/** A student's recorded result: points, or absent with none, and an optional note */
export type TestResult = {
  points: number | null
  is_absent: boolean
  feedback: string | null
  recorded_at: string
}

export type TestStudent = {
  id: string
  first_name: string
  last_name: string
  student_number: string
}

/** One actively enrolled student and their result, or null before one is recorded */
export type TestSheetRow = {
  student: TestStudent
  result: TestResult | null
}

/** A test as its setters see it: every actively enrolled student of the group, by name, with their result */
export type TestSheet = Test & {
  rows: TestSheetRow[]
}

/** A test as its student sees it, with only their own result */
export type StudentTest = Test & {
  result: TestResult | null
}
