import { useId, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { formatDayRange } from '../utils/format'
import { YEAR_PERIOD_KINDS } from '../utils/year-periods'
import type { YearPeriod, YearPeriodKind } from '../utils/year-periods'
import { RowAction } from './row-actions'
import { useFormatDay } from '#/lib/use-format-date'

const COPY = {
  term: { title: 'Terms', addLabel: 'Add term', empty: 'No terms yet.' },
  holiday: { title: 'Holidays', addLabel: 'Add holiday', empty: 'No holidays yet.' },
} as const satisfies Record<YearPeriodKind, { title: string; addLabel: string; empty: string }>

export type AddYearPeriodInput = {
  year: AcademicYear
  periodKind: YearPeriodKind
}

export type YearPeriodChange = AddYearPeriodInput & {
  period: YearPeriod
}

interface YearPeriodListProps {
  year: AcademicYear
  periodKind: YearPeriodKind
  isEditable: boolean
  onAdd: (input: AddYearPeriodInput) => void
  onEdit: (change: YearPeriodChange) => void
  onRemove: (change: YearPeriodChange) => void
}

/** A year's terms or holidays, in date order */
export function YearPeriodList({ year, periodKind, isEditable, onAdd, onEdit, onRemove }: YearPeriodListProps) {
  const titleId = useId()
  const copy = COPY[periodKind]
  const periods = year[YEAR_PERIOD_KINDS[periodKind].field]

  return (
    <section aria-labelledby={titleId} className="grid min-w-0 content-start gap-1 rounded-xl border border-rule px-4 py-3">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h4 id={titleId} className="font-data text-[0.78rem] tracking-[0.06em] text-ink-3 uppercase">
          {copy.title}
        </h4>
        {isEditable ? <RowAction icon={Plus} label={copy.addLabel} tone="default" onClick={() => onAdd({ year, periodKind })} /> : null}
      </div>
      {periods.length === 0 ? (
        <p className="py-1 text-[0.93rem] text-ink-3">{copy.empty}</p>
      ) : (
        <ul>
          {periods.map((period) => (
            <YearPeriodRow key={period.id} change={{ year, periodKind, period }} isEditable={isEditable} onEdit={onEdit} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface YearPeriodRowProps {
  change: YearPeriodChange
  isEditable: boolean
  onEdit: (change: YearPeriodChange) => void
  onRemove: (change: YearPeriodChange) => void
}

function YearPeriodRow({ change, isEditable, onEdit, onRemove }: YearPeriodRowProps) {
  const formatDay = useFormatDay()
  const { period } = change
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rule py-2.5 first:border-t-0">
      <span className="grid min-w-[160px] flex-1 leading-tight">
        <span className="font-semibold">{period.name}</span>
        <span className="text-[0.88rem] text-ink-3">{formatDayRange({ range: period, formatDay })}</span>
      </span>
      {isEditable ? <YearPeriodActions change={change} onEdit={onEdit} onRemove={onRemove} /> : null}
    </li>
  )
}

type YearPeriodActionsProps = Omit<YearPeriodRowProps, 'isEditable'>

/** Edit and delete; deleting asks once */
function YearPeriodActions({ change, onEdit, onRemove }: YearPeriodActionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (!isConfirmingRemove) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        <RowAction icon={Pencil} label="Edit" tone="default" onClick={() => onEdit(change)} />
        <RowAction icon={Trash2} label="Delete" tone="danger" onClick={() => setIsConfirmingRemove(true)} />
      </span>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Delete ${change.period.name}`}>
      <RowAction label="Delete" tone="confirm" onClick={() => onRemove(change)} />
      <RowAction label="Keep" tone="ghost" onClick={() => setIsConfirmingRemove(false)} />
    </span>
  )
}
