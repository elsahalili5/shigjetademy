// Grades: a read-only gradebook filled in from marked assignment hand-ins. Nothing is stored for it; each cell and average is worked out when it is read.
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

/** An assignment with points, as a gradebook column. Its due date is an ISO timestamp in UTC. */
export type GradeAssignment = {
  id: string
  title: string
  due_at: string
  max_points: number
}

/** Where one student stands on one assignment: marked with points, handed in and waiting, missing past the due date, or not due yet */
export type GradeCellStatus = 'MARKED' | 'HANDED_IN' | 'MISSING' | 'NOT_DUE'

/** One student's result on one assignment; points and feedback only once it is marked */
export type GradeCell = {
  assignment_id: string
  status: GradeCellStatus
  points: number | null
  feedback: string | null
}

/** Points over max points of marked work only; missing work doesn't count. percent is rounded to a whole number. */
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

/** A group's gradebook: its assignments with points by due date, and its actively enrolled students by name */
export type Gradebook = {
  group: GradeGroup
  assignments: GradeAssignment[]
  rows: GradebookRow[]
}

/** One assignment and the student's own result on it */
export type StudentGrade = {
  assignment: GradeAssignment
  cell: GradeCell
}

/** One of a student's groups, with their own results by due date and their average there */
export type StudentGroupGrades = {
  group: GradeGroup
  grades: StudentGrade[]
  average: GradeAverage | null
}
