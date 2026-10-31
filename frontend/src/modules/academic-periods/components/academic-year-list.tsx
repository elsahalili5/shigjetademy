import { useId, useState } from 'react'
import { CalendarRange, CalendarCheck, Pencil, Trash2 } from 'lucide-react'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { LoadError } from '#/components/LoadError'
import { formatDayRange } from '../utils/format'
import { RowAction } from './row-actions'
import { SkeletonRows } from './skeleton-rows'
import { YearPeriodList } from './year-period-list'
import type { AddYearPeriodInput, YearPeriodChange } from './year-period-list'

export type RemoveAcademicYearInput = {
  year: AcademicYear
  newCurrentId?: string
}

interface AcademicYearListProps {
  status: 'pending' | 'error' | 'success'
  years?: AcademicYear[]
  isEditable: boolean
  onRetry: () => void
  onEdit: (year: AcademicYear) => void
  onMakeCurrent: (year: AcademicYear) => void
  onRemove: (input: RemoveAcademicYearInput) => void
  onAddPeriod: (input: AddYearPeriodInput) => void
  onEditPeriod: (change: YearPeriodChange) => void
  onRemovePeriod: (change: YearPeriodChange) => void
}

export function AcademicYearList({ status, years, onRetry, ...rowProps }: AcademicYearListProps) {
  if (status === 'error') return <LoadError what="academic years" onRetry={onRetry} />
  if (!years) return <SkeletonRows />

  if (years.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <CalendarRange className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
        <p className="font-semibold">No academic years yet</p>
        <p className="text-ink-2">{rowProps.isEditable ? 'Add your school year, then its terms and holidays.' : 'Your organization hasn’t added any yet.'}</p>
      </div>
    )
  }

  return (
    <ul>
      {years.map((year) => (
        <AcademicYearRow key={year.id} year={year} otherYears={years.filter((other) => other.id !== year.id)} {...rowProps} />
      ))}
    </ul>
  )
}

interface AcademicYearRowProps {
  year: AcademicYear
  otherYears: AcademicYear[]
  isEditable: boolean
  onEdit: (year: AcademicYear) => void
  onMakeCurrent: (year: AcademicYear) => void
  onRemove: (input: RemoveAcademicYearInput) => void
  onAddPeriod: (input: AddYearPeriodInput) => void
  onEditPeriod: (change: YearPeriodChange) => void
  onRemovePeriod: (change: YearPeriodChange) => void
}

function AcademicYearRow({ year, otherYears, isEditable, onEdit, onMakeCurrent, onRemove, onAddPeriod, onEditPeriod, onRemovePeriod }: AcademicYearRowProps) {
  const titleId = useId()

  return (
    <li className="border-b border-rule last:border-b-0">
      <section aria-labelledby={titleId} className="grid gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-green-wash text-green-deep" aria-hidden="true">
            <CalendarRange size={18} strokeWidth={1.8} />
          </span>
          <span className="grid min-w-[200px] flex-1 gap-0.5 leading-tight">
            <span className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="font-semibold">
                {year.name}
              </h3>
              {year.is_current ? <span className="chip chip--green">Current</span> : null}
            </span>
            <span className="text-[0.88rem] text-ink-3">{formatDayRange(year)}</span>
          </span>
          {isEditable ? <AcademicYearActions year={year} otherYears={otherYears} onEdit={onEdit} onMakeCurrent={onMakeCurrent} onRemove={onRemove} /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <YearPeriodList year={year} periodKind="term" isEditable={isEditable} onAdd={onAddPeriod} onEdit={onEditPeriod} onRemove={onRemovePeriod} />
          <YearPeriodList year={year} periodKind="holiday" isEditable={isEditable} onAdd={onAddPeriod} onEdit={onEditPeriod} onRemove={onRemovePeriod} />
        </div>
      </section>
    </li>
  )
}

type AcademicYearActionsProps = Pick<AcademicYearRowProps, 'year' | 'otherYears' | 'onEdit' | 'onMakeCurrent' | 'onRemove'>

/** Make current, edit and delete; deleting asks once, and deleting the current year first asks which one takes over */
function AcademicYearActions({ year, otherYears, onEdit, onMakeCurrent, onRemove }: AcademicYearActionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (!isConfirmingRemove) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        {year.is_current ? null : <RowAction icon={CalendarCheck} label="Make current" tone="default" onClick={() => onMakeCurrent(year)} />}
        <RowAction icon={Pencil} label="Edit" tone="default" onClick={() => onEdit(year)} />
        <RowAction icon={Trash2} label="Delete" tone="danger" onClick={() => setIsConfirmingRemove(true)} />
      </span>
    )
  }
  if (year.is_current && otherYears.length > 0) {
    return <ChooseNewCurrent year={year} otherYears={otherYears} onRemove={onRemove} onKeep={() => setIsConfirmingRemove(false)} />
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Delete ${year.name}`}>
      <span className="text-[0.93rem] text-ink-2">Its terms and holidays are deleted too.</span>
      <RowAction label="Delete" tone="confirm" onClick={() => onRemove({ year })} />
      <RowAction label="Keep" tone="ghost" onClick={() => setIsConfirmingRemove(false)} />
    </span>
  )
}

interface ChooseNewCurrentProps {
  year: AcademicYear
  otherYears: AcademicYear[]
  onRemove: (input: RemoveAcademicYearInput) => void
  onKeep: () => void
}

function ChooseNewCurrent({ year, otherYears, onRemove, onKeep }: ChooseNewCurrentProps) {
  const selectId = useId()
  const [newCurrentId, setNewCurrentId] = useState('')

  return (
    <span className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={`Delete ${year.name}`}>
      <span className="text-[0.93rem] text-ink-2">Its terms and holidays are deleted too, and another year becomes current.</span>
      <label className="visually-hidden" htmlFor={selectId}>
        New current year
      </label>
      <select
        id={selectId}
        className="min-h-9 rounded-lg border border-rule-strong bg-white px-2.5 text-[0.95rem] focus:border-green-deep focus:outline-none"
        value={newCurrentId}
        onChange={(event) => setNewCurrentId(event.target.value)}
      >
        <option value="">Choose a year</option>
        {otherYears.map((other) => (
          <option key={other.id} value={other.id}>
            {other.name}
          </option>
        ))}
      </select>
      <RowAction label="Delete" tone="confirm" isDisabled={!newCurrentId} onClick={() => onRemove({ year, newCurrentId })} />
      <RowAction label="Keep" tone="ghost" onClick={onKeep} />
    </span>
  )
}
