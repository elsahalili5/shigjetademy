import { Link } from '@tanstack/react-router'
import type { GroupReport } from '@shigjetademy/shared/grades'
import { GradeAverage } from '#/modules/grades/components/grade-average'
import { isBelowPassMark } from '../utils/report-charts'
import { toReportSearch } from '../utils/report-search'
import { AverageMeter } from './average-meter'
import { BelowPassMarkFlag } from './below-pass-mark-flag'

// Tighter below sm, so the table fits a 375px screen without scrolling sideways
const HEADER_CELL_CLASS = 'px-2.5 sm:px-4 py-3 text-left align-bottom text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-2.5 sm:px-4 py-3 align-middle tabular-nums sm:whitespace-nowrap'

interface GroupReportTableProps {
  report: GroupReport
}

/** One row per student, opening their report for the same term: the average over their marked work, flagged under the pass mark, and how much of their work is marked or missing */
export function GroupReportTable({ report }: GroupReportTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-rule">
      <table className="w-full border-collapse" aria-label={`Students in ${report.group.name}`}>
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Student
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Average
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Marked
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Missing<span className="max-sm:sr-only"> assignments</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {report.students.map((row) => (
            <tr key={row.student.id} className="border-b border-rule last:border-b-0">
              <th scope="row" className={`${CELL_CLASS} text-left font-semibold`}>
                <Link
                  to="/dashboard/performance/$studentId"
                  params={{ studentId: row.student.id }}
                  search={toReportSearch({ termId: report.term?.id ?? null, groupId: report.group.id })}
                  className="text-ink underline-offset-2 hover:underline"
                >
                  {row.student.first_name} {row.student.last_name}
                </Link>
              </th>
              <td className={CELL_CLASS}>
                <span className="inline-flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                  <GradeAverage average={row.average} />
                  {row.average ? (
                    <span className="hidden sm:block">
                      <AverageMeter average={row.average} size="inline" />
                    </span>
                  ) : null}
                  {isBelowPassMark(row.average) ? <BelowPassMarkFlag variant="responsive" /> : null}
                </span>
              </td>
              <td className={CELL_CLASS}>{row.marked_count}</td>
              <td className={CELL_CLASS}>{row.missing_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
