// Grades: a read-only gradebook filled in from marked assignment hand-ins and recorded test results. Nothing is stored for it; each cell and average is worked out when it is read.
import { z } from 'zod'
import type { AcademicTerm } from './academic-periods.ts'

export const gradeGroupQuerySchema = z.object({
  group_id: z.uuid('Choose a group.'),
})

export type GradeGroupQuery = z.infer<typeof gradeGroupQuerySchema>

/** A report covers one term; without one it covers the term that holds today */
export const gradeReportQuerySchema = z.object({
  term_id: z.uuid('Choose a term.').optional(),
})

export type GradeReportQuery = z.infer<typeof gradeReportQuerySchema>

/** A whole: averages are points over max points times this */
export const PERCENT = 100

/** Students averaging under this percent are flagged in reports */
export const PASS_MARK_PERCENT = 50

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

/** A term a report can cover, with the name of its year, since terms of different years often share a name */
export type ReportTerm = AcademicTerm & {
  year_name: string
}

/** The terms to pick from, newest first, and the one the report covers; null when no terms are set up, so every date counts */
export type ReportTerms = {
  terms: ReportTerm[]
  term: ReportTerm | null
}

/** The average over marked work, and how much work is marked or missing; only assignments are ever missing */
export type Performance = {
  average: GradeAverage | null
  marked_count: number
  missing_count: number
}

/** How one group did in the term: its actively enrolled students and all their work together */
export type GroupPerformance = Performance & {
  group: GradeGroup
  student_count: number
}

/** Every group the viewer reaches, by name, for one term, and how many students average under the pass mark in at least one of them */
export type GradeOverview = ReportTerms & {
  groups: GroupPerformance[]
  below_pass_count: number
}

/** How one student did in a group in the term */
export type StudentPerformance = Performance & {
  student: GradeStudent
}

/** One group's actively enrolled students, by name, for one term */
export type GroupReport = ReportTerms & {
  group: GradeGroup
  students: StudentPerformance[]
}

/** One student's report for one term: their work and average in each group the viewer reaches and they are actively enrolled in, by group name */
export type StudentReport = ReportTerms & {
  student: GradeStudent
  groups: StudentGroupGrades[]
}
