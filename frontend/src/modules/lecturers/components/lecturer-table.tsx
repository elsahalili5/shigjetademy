import type { ReactNode } from 'react'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { Lecturer } from '@shigjetademy/shared/lecturers'
import { EMPLOYMENT_TYPE_LABELS } from '../utils/employment-type-labels'
import { LecturerLoginStatus } from './lecturer-login-status'

const HEADER_CELL_CLASS = 'px-5 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

const CELL_CLASS = 'px-5 py-3.5 align-middle'

// Phones keep the name and the actions; subjects and places show under the name instead
const WIDE_ONLY_CLASS = 'max-[640px]:hidden'

const NARROW_ONLY_CLASS = 'hidden max-[640px]:block'

// Long subjects and places shrink first, with the full text on hover, so the actions keep their room
const TRUNCATE_CLASS = 'block max-w-[26ch] truncate'

/** "Sciences · Main campus, North campus", or what of it is recorded */
const getWhere = (lecturer: Lecturer) =>
  [lecturer.department?.name, lecturer.locations.map((location) => location.name).join(', ')].filter(Boolean).join(' · ')

interface LecturerTableProps {
  lecturers: Lecturer[]
  renderActions: (lecturer: Lecturer) => ReactNode
}

export function LecturerTable({ lecturers, renderActions }: LecturerTableProps) {
  return (
    // Scrolls sideways on narrow screens, so the row actions never wrap
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Lecturers">
        <thead className="border-b border-rule">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Name
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Subjects
            </th>
            <th scope="col" className={`${HEADER_CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
              Where
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Login
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lecturers.map((lecturer) => (
            <LecturerRow key={lecturer.id} lecturer={lecturer} actions={renderActions(lecturer)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface LecturerRowProps {
  lecturer: Lecturer
  actions: ReactNode
}

function LecturerRow({ lecturer, actions }: LecturerRowProps) {
  const where = getWhere(lecturer)
  const locationNames = lecturer.locations.map((location) => location.name).join(', ')
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className={CELL_CLASS}>
        <span className="grid gap-0.5 leading-tight">
          <span className="font-semibold">{getLecturerName(lecturer)}</span>
          <span className="text-[0.88rem] text-ink-3">
            {EMPLOYMENT_TYPE_LABELS[lecturer.employment_type]}
            {lecturer.email ? <span className="break-all"> · {lecturer.email}</span> : null}
          </span>
          <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-2`}>{lecturer.subjects.join(', ')}</span>
          {where ? <span className={`${NARROW_ONLY_CLASS} text-[0.88rem] text-ink-3`}>{where}</span> : null}
        </span>
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
        <SubjectList subjects={lecturer.subjects} />
      </td>
      <td className={`${CELL_CLASS} ${WIDE_ONLY_CLASS}`}>
        <span className="grid gap-0.5 leading-tight">
          {lecturer.department ? (
            <span className={`${TRUNCATE_CLASS} font-semibold`} title={lecturer.department.name}>
              {lecturer.department.name}
            </span>
          ) : null}
          {locationNames ? (
            <span className={`${TRUNCATE_CLASS} text-[0.93rem] text-ink-2`} title={locationNames}>
              {locationNames}
            </span>
          ) : null}
          {where ? null : <span className="text-ink-3">Not set</span>}
        </span>
      </td>
      <td className={CELL_CLASS}>
        <LecturerLoginStatus lecturer={lecturer} />
      </td>
      <td className={`${CELL_CLASS} w-px text-right whitespace-nowrap`}>{actions}</td>
    </tr>
  )
}

interface SubjectListProps {
  subjects: string[]
}

function SubjectList({ subjects }: SubjectListProps) {
  if (subjects.length === 0) return <span className="text-ink-3">None yet</span>
  const text = subjects.join(', ')
  return (
    <span className={TRUNCATE_CLASS} title={text}>
      {text}
    </span>
  )
}
