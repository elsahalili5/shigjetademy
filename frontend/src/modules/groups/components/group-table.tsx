import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Group } from '@shigjetademy/shared/groups'
import { CLICKABLE_ROW_CLASS, ROW_ACTIONS_ATTRIBUTE, ROW_LINK_CLASS, isRowClickIgnored } from '#/lib/row-click'
import { getEnrolmentCountLabel } from '../utils/enrolment-count'
import { getGroupLecturerName } from '../utils/lecturer-label'
import { getScheduleLabel } from '../utils/schedule-label'

const HEADER_CELL_CLASS = 'px-5 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-5 py-3.5 align-middle'

// Phones keep the name and the actions; the rest shows under the name instead
const WIDE_ONLY_CLASS = 'max-[640px]:hidden'

const NARROW_ONLY_CLASS = 'hidden max-[640px]:block'

/** "2026–27 · Autumn term" */
const getPeriod = (group: Group) => [group.academic_year.name, group.academic_term?.name].filter(Boolean).join(' · ')

const getSeats = (capacity: number) => (capacity === 1 ? '1 seat' : `${capacity} seats`)

/** "Main campus · 20 seats", or what of it is recorded */
const getWhere = (group: Group) => [group.location?.name, group.capacity === null ? null : getSeats(group.capacity)].filter(Boolean).join(' · ')

interface GroupTableProps {
  groups: Group[]
  /** Each row's actions; leave out for a read-only table without an actions column */
  renderActions?: (group: Group) => ReactNode
  /** 'list' for the Groups page, one status at a time across courses; 'course' for one course's page, both statuses and no course name */
  variant?: GroupTableVariant
}

export type GroupTableVariant = 'list' | 'course'

export function GroupTable({ groups, renderActions, variant = 'list' }: GroupTableProps) {
  return (
    // Scrolls sideways on narrow screens, so the row actions never wrap
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Groups">
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Name
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              School year
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Where
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Lecturer
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Schedule
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Students
            </th>
            {renderActions ? (
              <th scope="col" className={HEADER_CELL_CLASS}>
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} actions={renderActions?.(group)} variant={variant} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface GroupRowProps {
  group: Group
  /** Undefined when the table has no actions column */
  actions?: ReactNode
  variant: GroupTableVariant
}

function GroupRow({ group, actions, variant }: GroupRowProps) {
  const period = getPeriod(group)
  const where = getWhere(group)
  const lecturer = group.lecturer ? getGroupLecturerName(group.lecturer) : null
  const schedule = getScheduleLabel(group.schedule)
  const navigate = useNavigate()

  // The whole row opens the group; the name stays a real link for keyboards and screen readers
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (isRowClickIgnored(event)) return
    void navigate({ to: '/dashboard/groups/$groupId', params: { groupId: group.id } })
  }

  return (
    <tr className={`border-b border-rule last:border-b-0 ${CLICKABLE_ROW_CLASS}`} onClick={handleRowClick}>
      <td className={CELL_CLASS}>
        <span className="grid gap-0.5 leading-tight">
          <Link to="/dashboard/groups/$groupId" params={{ groupId: group.id }} className={ROW_LINK_CLASS}>
            {group.name}
          </Link>
          <GroupRowNote group={group} variant={variant} />
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{period}</span>
          {where ? <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{where}</span> : null}
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{lecturer ?? 'No lecturer'}</span>
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{schedule || 'No schedule'}</span>
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{period}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{where || <span className="text-ink-3">Not set</span>}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{lecturer ?? <span className="text-ink-3">No lecturer</span>}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS} tabular`}>{schedule || <span className="text-ink-3">No schedule</span>}</td>
      <td className={`${CELL_CLASS} tabular whitespace-nowrap`}>{getEnrolmentCountLabel(group)}</td>
      {actions === undefined ? null : (
        <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`} {...ROW_ACTIONS_ATTRIBUTE}>
          {actions}
        </td>
      )}
    </tr>
  )
}

interface GroupRowNoteProps {
  group: Group
  variant: GroupTableVariant
}

/** Under the name: the course across a list of courses, or on one course's page, a mark on an archived group */
function GroupRowNote({ group, variant }: GroupRowNoteProps) {
  switch (variant) {
    case 'list':
      return <span className="text-[0.88rem] text-ink-3">{group.course.name}</span>
    case 'course':
      return group.status === 'ARCHIVED' ? <span className="text-[0.88rem] text-ink-3">Archived</span> : null
    default: {
      const unknown: never = variant
      throw new Error(`Unknown group table variant: ${String(unknown)}`)
    }
  }
}
