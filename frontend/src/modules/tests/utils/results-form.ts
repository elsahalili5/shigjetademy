import { z } from 'zod'
import { testResultEntrySchema } from '@shigjetademy/shared/tests'
import type { RecordTestResultsInput, TestSheet, TestSheetRow } from '@shigjetademy/shared/tests'
import { WHOLE_NUMBER } from './points'

/** What is wrong with the typed points, or null when they fit the max */
const getPointsProblem = ({ points, maxPoints }: { points: string; maxPoints: number }) => {
  if (!WHOLE_NUMBER.test(points)) return 'Enter whole points.'
  if (Number(points) > maxPoints) return `Points can be at most ${maxPoints}.`
  return null
}

const rowSchema = z.object({
  student_id: z.string(),
  /** As typed; ignored while the student is marked absent, whose points input is disabled */
  points: z.string().optional(),
  is_absent: z.boolean(),
  feedback: testResultEntrySchema.shape.feedback,
})

type ResultsRow = z.infer<typeof rowSchema>

/** The results sheet: a row per student, each checked against the test's max */
export const createResultsFormSchema = (maxPoints: number) =>
  z.object({
    rows: z.array(
      rowSchema.superRefine((row, context) => {
        if (row.is_absent) return
        const points = row.points?.trim() ?? ''
        if (!points) {
          if (row.feedback) context.addIssue({ code: 'custom', path: ['points'], message: 'Give points or mark the student absent.' })
          return
        }
        const message = getPointsProblem({ points, maxPoints })
        if (message) context.addIssue({ code: 'custom', path: ['points'], message })
      }),
    ),
  })

export type ResultsFormValues = { rows: ResultsRow[] }

/** The sheet starts from the saved results, and empty for students without one */
export const toResultsFormValues = (rows: TestSheetRow[]): ResultsFormValues => ({
  rows: rows.map(({ student, result }) => ({
    student_id: student.id,
    points: typeof result?.points === 'number' ? String(result.points) : '',
    is_absent: result?.is_absent ?? false,
    feedback: result?.feedback ?? '',
  })),
})

const toPoints = (row: ResultsRow) => {
  const points = row.points?.trim() ?? ''
  if (row.is_absent || !points) return null
  return Number(points)
}

/** Every row is sent; one with neither points nor absent clears that student's result */
export const toRecordInput = (values: ResultsFormValues): RecordTestResultsInput => ({
  results: values.rows.map((row) => ({ student_id: row.student_id, points: toPoints(row), is_absent: row.is_absent, feedback: row.feedback })),
})

/** Changes whenever the test or anyone's saved result changes, so the sheet starts again from what is saved */
export const getResultsKey = (sheet: TestSheet) => `${sheet.updated_at}:${JSON.stringify(sheet.rows.map((row) => [row.student.id, row.result]))}`
