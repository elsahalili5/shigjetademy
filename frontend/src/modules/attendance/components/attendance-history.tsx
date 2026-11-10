import { History } from 'lucide-react'
import type { AttendanceHistoryEntry, AttendanceSession } from '@shigjetademy/shared/attendance'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatDay } from '#/lib/use-format-date'
import { useAttendanceHistory } from '../hooks/use-attendance-history'

/** The history entry's session, shaped the way the register needs it to open */
const toHistorySession = (entry: AttendanceHistoryEntry): AttendanceSession => ({
  group_id: entry.group_id,
  name: entry.name,
  course: entry.course,
  location: null,
  start_time: entry.start_time,
  end_time: entry.end_time,
  rescheduled_from: null,
})

interface AttendanceHistoryProps {
  organizationId: string
  onSelect: (params: { date: string; session: AttendanceSession }) => void
}

/** The last 30 days' sessions with at least one saved mark, so a past register reopens without picking its date and group again */
export function AttendanceHistory({ organizationId, onSelect }: AttendanceHistoryProps) {
  const history = useAttendanceHistory({ organizationId })

  const handleSelect = (entry: AttendanceHistoryEntry) => onSelect({ date: entry.date, session: toHistorySession(entry) })

  if (history.status === 'error') return <LoadError what="attendance history" onRetry={() => void history.refetch()} />
  if (!history.data) return <SkeletonRows />
  if (history.data.length === 0) return <EmptyMessage icon={History} title="No attendance taken yet" text="Sessions you mark will show up here." />

  return (
    <ul className="grid" aria-label="Attendance history">
      {history.data.map((entry) => (
        <AttendanceHistoryRow key={`${entry.group_id}/${entry.date}/${entry.start_time}`} entry={entry} onSelect={handleSelect} />
      ))}
    </ul>
  )
}

interface AttendanceHistoryRowProps {
  entry: AttendanceHistoryEntry
  onSelect: (entry: AttendanceHistoryEntry) => void
}

function AttendanceHistoryRow({ entry, onSelect }: AttendanceHistoryRowProps) {
  const formatDay = useFormatDay()

  const handleClick = () => onSelect(entry)

  return (
    <li className="border-b border-rule last:border-b-0">
      <button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-left hover:bg-mist" onClick={handleClick}>
        <span className="font-semibold">
          {entry.name} · {entry.course}
        </span>
        <span className="tabular text-ink-2">
          {formatDay(entry.date)} · {entry.start_time}–{entry.end_time}
        </span>
        <span className="tabular text-ink-2">
          {entry.marked}/{entry.total} marked
        </span>
      </button>
    </li>
  )
}
