// Grades: a read-only gradebook filled in from marked assignment hand-ins and recorded test results. Nothing is stored for it; each cell and average is worked out when it is read.
import { z } from 'zod'

export const gradeGroupQuerySchema = z.object({
  group_id: z.uuid('Choose a group.'),
})

export type GradeGroupQuery = z.infer<typeof gradeGroupQuerySchema>

/** A group the viewer reads grades for */
export type GradeGroup = {
  id: string
  name: string
  course_name: string
  is_archived: boolean
}

/** What a gradebook column is: an assignment with points, or a test */
export type GradeColumnKind = 'ASSIGNMENT' | 'TEST'

/** A gradebook column. date is an assignment's due date or a test's day and time, an ISO timestamp in UTC. */
export type GradeColumn = {
  kind: GradeColumnKind
  id: string
  title: string
  date: string
  max_points: number
}

/**
 * Where one student stands on one column. Both: marked with points, or not due (held) yet. An assignment: handed in and waiting, or missing past the due date.
 * A test: absent, or not recorded yet once it was held.
 */
export type GradeCellStatus = 'MARKED' | 'HANDED_IN' | 'MISSING' | 'NOT_DUE' | 'ABSENT' | 'NOT_RECORDED'

/** One student's result on one column; points once marked, and feedback once marked or noted beside an absence */
export type GradeCell = {
  column_id: string
  status: GradeCellStatus
  points: number | null
  feedback: string | null
}

/** Points over max points of marked work only; missing work and absences don't count. percent is rounded to a whole number. */
export type GradeAverage = {
  points: number
  max_points: number
  percent: number
}

export type GradeStudent = {
  id: string
  first_name: string
  last_name: string
}

/** One student's row: a cell per column, in column order */
export type GradebookRow = {
  student: GradeStudent
  cells: GradeCell[]
  average: GradeAverage | null
}

/** A group's gradebook: its assignments with points and its tests by date, and its actively enrolled students by name */
export type Gradebook = {
  group: GradeGroup
  columns: GradeColumn[]
  rows: GradebookRow[]
}

/** One column and the student's own result on it */
export type StudentGrade = {
  column: GradeColumn
  cell: GradeCell
}

/** One of a student's groups, with their own results by date and their average there */
export type StudentGroupGrades = {
  group: GradeGroup
  grades: StudentGrade[]
  average: GradeAverage | null
}
