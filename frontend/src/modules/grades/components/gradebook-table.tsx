import { Link } from '@tanstack/react-router'
import type { GradeColumn, Gradebook } from '@shigjetademy/shared/grades'
import { useFormatDate } from '#/lib/use-format-date'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isTestsMember } from '#/modules/tests/utils/permissions'
import { GradeAverage } from './grade-average'
import { getColumnDateLabel } from '../utils/column-date-label'
import { GradeCellContent } from './grade-cell-content'
import { GradeColumnKindChip } from './grade-column-kind-chip'

const HEADER_CELL_CLASS = 'px-4 py-3 text-left align-bottom text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-4 py-3 align-middle whitespace-nowrap'

interface GradebookTableProps {
  gradebook: Gradebook
  /** The last column's heading: the overall average, or one kind's when the columns are filtered */
  averageLabel: string
}

/** Students down, assignments with points and tests across by date, and each student's average at the end; each title opens its assignment to mark or its test's results */
export function GradebookTable({ gradebook, averageLabel }: GradebookTableProps) {
  const formatDate = useFormatDate()
  const membership = useActiveMembership()
  // An admin with Grades but not Tests can't open a test's results
  const canOpenTests = isTestsMember(membership)
  return (
    <div className="w-full overflow-x-auto rounded-card border border-rule">
      <table className="w-full border-collapse" aria-label={`Gradebook for ${gradebook.group.name}`}>
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={`${HEADER_CELL_CLASS} sticky left-0 bg-white`}>
              Student
            </th>
            {gradebook.columns.map((column) => (
              <th key={column.id} scope="col" className={`${HEADER_CELL_CLASS} min-w-40`}>
                <span className="flex flex-col items-start gap-1.5">
                  <GradeColumnKindChip kind={column.kind} />
                  <GradeColumnLink column={column} canOpenTests={canOpenTests} />
                  <span className="font-normal">
                    {getColumnDateLabel(column.kind)} <time dateTime={column.date}>{formatDate(column.date)}</time> · out of {column.max_points}
                  </span>
                </span>
              </th>
            ))}
            <th scope="col" className={HEADER_CELL_CLASS}>
              {averageLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {gradebook.rows.map((row) => (
            <tr key={row.student.id} className="border-b border-rule last:border-b-0">
              <th scope="row" className={`${CELL_CLASS} sticky left-0 bg-white text-left font-semibold`}>
                {row.student.first_name} {row.student.last_name}
              </th>
              {row.cells.map((cell, index) => (
                <td key={cell.column_id} className={CELL_CLASS}>
                  <GradeCellContent cell={cell} maxPoints={gradebook.columns[index].max_points} />
                </td>
              ))}
              <td className={CELL_CLASS}>
                <GradeAverage average={row.average} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const COLUMN_LINK_CLASS = 'block font-semibold text-ink underline-offset-2 hover:underline'

interface GradeColumnLinkProps {
  column: GradeColumn
  canOpenTests: boolean
}

/** An assignment's title opens it to mark; a test's opens its results sheet for those who may, and is plain text for everyone else */
function GradeColumnLink({ column, canOpenTests }: GradeColumnLinkProps) {
  switch (column.kind) {
    case 'ASSIGNMENT':
      return (
        <Link to="/dashboard/assignments/$assignmentId" params={{ assignmentId: column.id }} className={COLUMN_LINK_CLASS}>
          {column.title}
        </Link>
      )
    case 'TEST':
      if (!canOpenTests) return <span className="block font-semibold text-ink">{column.title}</span>
      return (
        <Link to="/dashboard/tests/$testId" params={{ testId: column.id }} className={COLUMN_LINK_CLASS}>
          {column.title}
        </Link>
      )
    default: {
      const unknown: never = column.kind
      throw new Error(`Unknown grade column: ${String(unknown)}`)
    }
  }
}
