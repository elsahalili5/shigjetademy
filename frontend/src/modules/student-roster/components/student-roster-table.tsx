import type { MouseEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { RosterEntry } from '@shigjetademy/shared/student-roster'
import { getStudentName } from '@shigjetademy/shared/students'
import { initials } from '#/lib/initials'
import { CLICKABLE_ROW_CLASS, ROW_ACTIONS_ATTRIBUTE, ROW_LINK_CLASS, isRowClickIgnored } from '#/lib/row-click'

const HEADER_CELL_CLASS = 'px-5 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-5 py-3.5 align-middle'

const WIDE_ONLY_CLASS = 'max-[640px]:hidden'

const NARROW_ONLY_CLASS = 'hidden max-[640px]:block'

interface StudentRosterTableProps {
  entries: RosterEntry[]
}

/** One row per student per group: a student in two groups shows twice, once for each */
export function StudentRosterTable({ entries }: StudentRosterTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Students">
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Name
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Email
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Group
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <StudentRosterRow key={`${entry.student_id}-${entry.group.id}`} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface StudentRosterRowProps {
  entry: RosterEntry
}

function StudentRosterRow({ entry }: StudentRosterRowProps) {
  const navigate = useNavigate()
  const name = getStudentName(entry)

  // The whole row opens the student; the name and the button stay real links for keyboards and screen readers
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (isRowClickIgnored(event)) return
    void navigate({ to: '/dashboard/my-students/$studentId', params: { studentId: entry.student_id } })
  }

  return (
    <tr className={`border-b border-rule last:border-b-0 ${CLICKABLE_ROW_CLASS}`} onClick={handleRowClick}>
      <td className={CELL_CLASS}>
        <span className="flex items-center gap-3">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-green-wash text-[0.85rem] font-bold text-green-deep" aria-hidden="true">
            {initials(name)}
          </span>
          <span className="grid min-w-0 gap-0.5 leading-tight">
            <Link to="/dashboard/my-students/$studentId" params={{ studentId: entry.student_id }} className={`truncate ${ROW_LINK_CLASS}`}>
              {name}
            </Link>
            <span className={`${NARROW_ONLY_CLASS} truncate text-[0.88rem] text-ink-3`}>{entry.email ?? 'No login'}</span>
            <span className={`${NARROW_ONLY_CLASS} truncate text-[0.88rem] text-ink-3`}>{entry.group.name}</span>
          </span>
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{entry.email ?? <span className="text-ink-3">No login</span>}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{entry.group.name}</td>
      <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`} {...ROW_ACTIONS_ATTRIBUTE}>
        <Link
          to="/dashboard/my-students/$studentId"
          params={{ studentId: entry.student_id }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 no-underline transition-colors duration-150 hover:bg-mist hover:text-ink"
        >
          View details
        </Link>
      </td>
    </tr>
  )
}
