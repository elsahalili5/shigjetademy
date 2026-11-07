import type { ReactNode } from 'react'
import type { Group } from '@shigjetademy/shared/groups'

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
  renderActions: (group: Group) => ReactNode
}

export function GroupTable({ groups, renderActions }: GroupTableProps) {
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
            <th scope="col" className={HEADER_CELL_CLASS}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} actions={renderActions(group)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface GroupRowProps {
  group: Group
  actions: ReactNode
}

function GroupRow({ group, actions }: GroupRowProps) {
  const period = getPeriod(group)
  const where = getWhere(group)
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className={CELL_CLASS}>
        <span className="grid gap-0.5 leading-tight">
          <span className="font-semibold">{group.name}</span>
          <span className="text-[0.88rem] text-ink-3">{group.course.name}</span>
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{period}</span>
          {where ? <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{where}</span> : null}
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{period}</td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>{where || <span className="text-ink-3">Not set</span>}</td>
      <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`}>{actions}</td>
    </tr>
  )
}
