import { useId, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import type { Group, LessonReschedule } from '@shigjetademy/shared/groups'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatLessonSlot } from '#/lib/use-format-date'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useCancelLessonReschedule } from '../hooks/use-cancel-lesson-reschedule'
import { useLessonReschedules } from '../hooks/use-lesson-reschedules'
import { isSchedulesManager } from '../utils/permissions'
import { LessonRescheduleDialog } from './lesson-reschedule-dialog'
import type { LessonRescheduleDialogMode } from './lesson-reschedule-dialog'

const ROW_ACTION_CLASS = 'inline-flex min-h-9 items-center rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

const STATUS_LABELS = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
} as const satisfies Record<LessonReschedule['status'], string>

interface GroupReschedulesSectionProps {
  organizationId: string
  group: Group
  /** The organization's time zone, for what counts as upcoming */
  timeZone: string
}

/** The group's lessons moved to another date and time, upcoming and past; timetable managers move and cancel them, except on an archived group */
export function GroupReschedulesSection({ organizationId, group, timeZone }: GroupReschedulesSectionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const membership = useActiveMembership()
  const [mode, setMode] = useState<LessonRescheduleDialogMode>({ openCount: 0 })
  const canChange = isSchedulesManager(membership) && group.status !== 'ARCHIVED'

  const handleOpen = () => {
    setMode((current) => ({ openCount: current.openCount + 1 }))
    dialogRef.current?.showModal()
  }

  return (
    <SectionCard
      title="Rescheduled lessons"
      action={
        canChange ? (
          <button type="button" className="button button--ghost min-h-10 px-4 text-base" onClick={handleOpen}>
            Reschedule a lesson
          </button>
        ) : null
      }
    >
      <RescheduleLists organizationId={organizationId} groupId={group.id} today={todayIn(timeZone)} canChange={canChange} />
      {canChange ? <LessonRescheduleDialog dialogRef={dialogRef} organizationId={organizationId} group={group} mode={mode} /> : null}
    </SectionCard>
  )
}

interface RescheduleListsProps {
  organizationId: string
  groupId: string
  /** The organization's day */
  today: string
  canChange: boolean
}

function RescheduleLists({ organizationId, groupId, today, canChange }: RescheduleListsProps) {
  const reschedules = useLessonReschedules({ organizationId, groupId })

  if (reschedules.status === 'error') return <LoadError what="rescheduled lessons" onRetry={() => void reschedules.refetch()} />
  if (!reschedules.data) return <SkeletonRows />
  if (reschedules.data.length === 0) return <EmptyMessage icon={CalendarClock} title="No rescheduled lessons" text="Lessons moved to another date or time show here." />

  const upcoming = reschedules.data.filter((reschedule) => reschedule.new_date >= today)
  // The server sends them by the day they moved to; the past reads newest first
  const past = reschedules.data.filter((reschedule) => reschedule.new_date < today).toReversed()
  const rowProps = { organizationId, groupId, canChange }

  return (
    <div className="grid gap-5 px-5 py-4">
      <RescheduleList title="Upcoming" reschedules={upcoming} {...rowProps} />
      <RescheduleList title="Past" reschedules={past} {...rowProps} />
    </div>
  )
}

interface RescheduleListProps {
  title: string
  reschedules: LessonReschedule[]
  organizationId: string
  groupId: string
  canChange: boolean
}

function RescheduleList({ title, reschedules, ...rowProps }: RescheduleListProps) {
  const titleId = useId()
  return (
    <section className="grid gap-2">
      <h3 id={titleId} className="text-[1.05rem] font-[650]">
        {title}
      </h3>
      {reschedules.length === 0 ? (
        <p className="text-ink-2">None.</p>
      ) : (
        <ul className="grid" aria-labelledby={titleId}>
          {reschedules.map((reschedule) => (
            <RescheduleRow key={reschedule.id} reschedule={reschedule} {...rowProps} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface RescheduleRowProps {
  reschedule: LessonReschedule
  organizationId: string
  groupId: string
  canChange: boolean
}

function RescheduleRow({ reschedule, organizationId, groupId, canChange }: RescheduleRowProps) {
  const formatLessonSlot = useFormatLessonSlot()
  const cancelReschedule = useCancelLessonReschedule({ organizationId, groupId })
  const [isConfirming, setIsConfirming] = useState(false)
  const original = formatLessonSlot({ day: reschedule.original_date, time: reschedule.original_start_time })
  const originalTimes = reschedule.original_end_time ? `${original}–${reschedule.original_end_time}` : original
  const isCancellable = canChange && reschedule.status === 'ACTIVE'

  const handleCancel = () => {
    setIsConfirming(false)
    cancelReschedule.mutate(reschedule.id)
  }

  return (
    <li className="grid gap-0.5 border-b border-rule py-2.5 last:border-b-0" aria-label={originalTimes}>
      <span className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="tabular font-semibold">{originalTimes}</span>
        <span className="text-[0.93rem] text-ink-2">{STATUS_LABELS[reschedule.status]}</span>
      </span>
      <span className="tabular text-ink-2">
        <span>Moved to {formatLessonSlot({ day: reschedule.new_date, time: reschedule.new_start_time })}</span> · until {reschedule.new_end_time}
      </span>
      {reschedule.reason ? <span className="text-[0.93rem] text-ink-2">{reschedule.reason}</span> : null}
      {isCancellable && isConfirming ? (
        <ConfirmGroup label={`Cancel the move of ${originalTimes}`} question="The lesson goes back to its own slot." confirmLabel="Cancel move" onConfirm={handleCancel} onCancel={() => setIsConfirming(false)} />
      ) : null}
      {isCancellable && !isConfirming ? (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <button type="button" className={ROW_ACTION_CLASS} aria-label={`Cancel the move of ${originalTimes}`} disabled={cancelReschedule.isPending} onClick={() => setIsConfirming(true)}>
            Cancel move
          </button>
        </span>
      ) : null}
      {cancelReschedule.isError ? <FormAlert>{getErrorMessage(cancelReschedule.error)}</FormAlert> : null}
    </li>
  )
}
