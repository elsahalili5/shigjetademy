import { PERCENT } from '@shigjetademy/shared/grades'
import type { GradeAverage, Gradebook, GradeCell, GradeColumn, GradeColumnKind } from '@shigjetademy/shared/grades'

export const GRADEBOOK_FILTERS = ['ALL', 'ASSIGNMENT', 'TEST'] as const

export type GradebookFilter = (typeof GRADEBOOK_FILTERS)[number]

export const GRADEBOOK_FILTER_LABELS: Record<GradebookFilter, string> = { ALL: 'All', ASSIGNMENT: 'Assignments', TEST: 'Tests' }

/** How many columns each tab shows */
export const getGradebookFilterCounts = (gradebook: Gradebook): Record<GradebookFilter, number> => {
  const countKind = (kind: GradeColumnKind) => gradebook.columns.filter((column) => column.kind === kind).length
  return { ALL: gradebook.columns.length, ASSIGNMENT: countKind('ASSIGNMENT'), TEST: countKind('TEST') }
}

type FilterGradebookParams = {
  gradebook: Gradebook
  filter: GradebookFilter
}

type GetKindAverageParams = {
  columns: GradeColumn[]
  cells: GradeCell[]
}

/** Points over max points of the marked cells only, as the server works out the overall average */
const getKindAverage = ({ columns, cells }: GetKindAverageParams): GradeAverage | null => {
  const marked = cells.flatMap((cell, index) => (cell.status === 'MARKED' ? [{ points: cell.points ?? 0, maxPoints: columns[index].max_points }] : []))
  if (marked.length === 0) return null
  const points = marked.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = marked.reduce((sum, item) => sum + item.maxPoints, 0)
  return { points, max_points: maxPoints, percent: Math.round((points / maxPoints) * PERCENT) }
}

/** Keeps only the columns of one kind, each row's cells for them, and each row's average over that kind */
export const filterGradebook = ({ gradebook, filter }: FilterGradebookParams): Gradebook => {
  if (filter === 'ALL') return gradebook
  const isKept = gradebook.columns.map((column) => column.kind === filter)
  const columns = gradebook.columns.filter((_, index) => isKept[index])
  return {
    ...gradebook,
    columns,
    rows: gradebook.rows.map((row) => {
      const cells = row.cells.filter((_, index) => isKept[index])
      return { ...row, cells, average: getKindAverage({ columns, cells }) }
    }),
  }
}

/** The average column's heading for each tab */
export const GRADEBOOK_AVERAGE_LABELS: Record<GradebookFilter, string> = { ALL: 'Average', ASSIGNMENT: 'Assignment average', TEST: 'Test average' }
