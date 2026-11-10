import { TriangleAlert } from 'lucide-react'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'
import { WEEKDAY_LABELS } from '#/modules/groups/utils/schedule-label'
import { getDayEntries, getWeekdaysInOrder, getWeeklyEntryKey } from '../utils/weekly-grid'

interface WeeklyScheduleGridProps {
  schedule: WeeklyScheduleEntry[]
  weekStart: WeekStart
  onSelectGroup: (groupId: string) => void
}

/** The week as columns, each day's meetings earliest first; clicking one opens its group */
export function WeeklyScheduleGrid({ schedule, weekStart, onSelectGroup }: WeeklyScheduleGridProps) {
  const weekdays = getWeekdaysInOrder({ weekStart })

  return (
    <div className="grid min-w-[840px] grid-cols-7 gap-3 px-5 py-4" role="table" aria-label="Weekly schedule">
      {weekdays.map((weekday) => (
        <ScheduleDayColumn key={weekday} weekday={weekday} entries={getDayEntries({ schedule, weekday })} onSelectGroup={onSelectGroup} />
      ))}
    </div>
  )
}

interface ScheduleDayColumnProps {
  weekday: WeeklyScheduleEntry['weekday']
  entries: WeeklyScheduleEntry[]
  onSelectGroup: (groupId: string) => void
}

function ScheduleDayColumn({ weekday, entries, onSelectGroup }: ScheduleDayColumnProps) {
  return (
    <div role="rowgroup" aria-label={WEEKDAY_LABELS[weekday]} className="grid min-w-0 gap-2">
      <span className="text-[0.87rem] font-[650] text-ink-3">{WEEKDAY_LABELS[weekday]}</span>
      {entries.length === 0 ? (
        <p className="text-[0.86rem] text-ink-3">No meetings</p>
      ) : (
        <ul className="grid gap-2">
          {entries.map((entry) => (
            <ScheduleMeetingCell key={getWeeklyEntryKey(entry)} entry={entry} onSelectGroup={onSelectGroup} />
          ))}
        </ul>
      )}
    </div>
  )
}

interface ScheduleMeetingCellProps {
  entry: WeeklyScheduleEntry
  onSelectGroup: (groupId: string) => void
}

const getClashTitle = (entry: WeeklyScheduleEntry) => {
  const reasons = [entry.clash.room ? 'room' : null, entry.clash.teacher ? 'teacher' : null].filter((reason): reason is string => reason !== null)
  if (reasons.length === 0) return undefined
  return `Clashes with another meeting: same ${reasons.join(' and ')} at an overlapping time.`
}

function ScheduleMeetingCell({ entry, onSelectGroup }: ScheduleMeetingCellProps) {
  const isClashing = entry.clash.room || entry.clash.teacher
  const title = getClashTitle(entry)

  return (
    <li>
      <button
        type="button"
        className={`w-full rounded-lg border px-2.5 py-2 text-left text-[0.87rem] leading-tight ${isClashing ? 'border-coral-deep bg-coral-wash' : 'border-rule bg-mist'}`}
        title={title}
        onClick={() => onSelectGroup(entry.group.id)}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          {isClashing ? <TriangleAlert className="flex-none text-coral-deep" size={14} strokeWidth={2} aria-hidden="true" /> : null}
          {entry.group.name}
        </span>
        <span className="tabular block text-ink-3">
          {entry.start_time}–{entry.end_time}
        </span>
        <span className="block text-ink-3">{entry.room?.name ?? 'No room assigned'}</span>
        <span className="block text-ink-3">{entry.teacher ? getLecturerName(entry.teacher) : 'No teacher'}</span>
        {title ? <span className="sr-only">{title}</span> : null}
      </button>
    </li>
  )
}
