import type { GradeOverview } from '@shigjetademy/shared/grades'
import { GradeAverage } from '#/modules/grades/components/grade-average'

const HEADER_CELL_CLASS = 'px-4 py-3 text-left align-bottom text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-4 py-3 align-middle whitespace-nowrap tabular-nums'

interface GroupOverviewTableProps {
  overview: GradeOverview
  /** Another term's numbers are loading, so these are the last term's */
  isUpdating: boolean
}

/** One row per group: its students, the average over all their marked work, and how much work is marked or missing */
export function GroupOverviewTable({ overview, isUpdating }: GroupOverviewTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-rule">
      <table className="w-full border-collapse" aria-label={`Groups in ${overview.term?.name ?? 'all terms'}`} aria-busy={isUpdating}>
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Group
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Students
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Average
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Marked
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Missing assignments
            </th>
          </tr>
        </thead>
        <tbody>
          {overview.groups.map((row) => (
            <tr key={row.group.id} className="border-b border-rule last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left align-middle">
                <span className="block font-semibold">{row.group.name}</span>
                <span className="block text-[0.93rem] font-normal text-ink-3">{row.group.course_name}</span>
              </th>
              <td className={CELL_CLASS}>{row.student_count}</td>
              <td className={CELL_CLASS}>
                <GradeAverage average={row.average} />
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
