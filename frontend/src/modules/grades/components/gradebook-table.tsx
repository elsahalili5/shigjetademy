import { Link } from '@tanstack/react-router'
import type { Gradebook } from '@shigjetademy/shared/grades'
import { useFormatDate } from '#/lib/use-format-date'
import { GradeAverage } from './grade-average'
import { GradeCellContent } from './grade-cell-content'

const HEADER_CELL_CLASS = 'px-4 py-3 text-left align-bottom text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-4 py-3 align-middle whitespace-nowrap'

interface GradebookTableProps {
  gradebook: Gradebook
}

/** Students down, assignments with points across by due date, and each student's average at the end; each title opens its assignment to mark */
export function GradebookTable({ gradebook }: GradebookTableProps) {
  const formatDate = useFormatDate()
  return (
    <div className="w-full overflow-x-auto rounded-card border border-rule">
      <table className="w-full border-collapse" aria-label={`Gradebook for ${gradebook.group.name}`}>
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={`${HEADER_CELL_CLASS} sticky left-0 bg-white`}>
              Student
            </th>
            {gradebook.assignments.map((assignment) => (
              <th key={assignment.id} scope="col" className={`${HEADER_CELL_CLASS} min-w-36`}>
                <Link to="/dashboard/assignments/$assignmentId" params={{ assignmentId: assignment.id }} className="block font-semibold text-ink underline-offset-2 hover:underline">
                  {assignment.title}
                </Link>
                <span className="block font-normal">
                  / {assignment.max_points} · <time dateTime={assignment.due_at}>{formatDate(assignment.due_at)}</time>
                </span>
              </th>
            ))}
            <th scope="col" className={HEADER_CELL_CLASS}>
              Average
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
                <td key={cell.assignment_id} className={CELL_CLASS}>
                  <GradeCellContent cell={cell} maxPoints={gradebook.assignments[index].max_points} />
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
