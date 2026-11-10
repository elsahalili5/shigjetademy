import { useEffect, useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CalendarX, Presentation } from 'lucide-react'
import type { LessonPlanSession } from '@shigjetademy/shared/lesson-plans'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatLessonSlot } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useLessonPlanSessions } from '../hooks/use-lesson-plan-sessions'
import { getLessonPlanSessionKey, getLessonPlanSessionLabel } from '../utils/session-label'
import { LessonPlanEditor } from './lesson-plan-editor'

interface LessonsPageProps {
  organizationId: string
  /** The organization's time zone, for what counts as today */
  timeZone: string
}

/** Pick a day, then one of its lesson sessions, then plan it: its topic ahead of time, and what was covered once it starts */
export function LessonsPage({ organizationId, timeZone }: LessonsPageProps) {
  const dateId = useId()
  const [date, setDate] = useState(() => todayIn(timeZone))
  const [session, setSession] = useState<LessonPlanSession | null>(null)

  // Another day has other sessions, so the choice starts over
  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value)
    setSession(null)
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Presentation} title="Lessons" subtitle="Plan a session’s topic ahead, and record what it covered." />

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard title="Session">
          <div className="grid gap-4 px-5 py-4">
            <div className="max-w-xs">
              <AuthField id={dateId} label="Date" type="date" value={date} onChange={handleDateChange} />
            </div>
            <LessonPlanSessionPicker organizationId={organizationId} date={date} session={session} onChange={setSession} />
          </div>
        </SectionCard>
        {date && session ? <LessonPlanEditor params={{ organizationId, groupId: session.group_id, date, startTime: session.start_time }} groupName={session.name} course={session.course} /> : null}
      </div>
    </div>
  )
}

interface LessonPlanSessionPickerProps {
  organizationId: string
  date: string
  session: LessonPlanSession | null
  onChange: (session: LessonPlanSession | null) => void
}

/** The day's sessions to choose from, one per group and start time, or why there are none */
function LessonPlanSessionPicker({ organizationId, date, session, onChange }: LessonPlanSessionPickerProps) {
  const pickerId = useId()
  const sessions = useLessonPlanSessions({ organizationId, date })
  const formatLessonSlot = useFormatLessonSlot()

  // The day's only session needs no manual pick; a day with none or several still does
  useEffect(() => {
    if (session === null && sessions.data?.length === 1) onChange(sessions.data[0])
  }, [sessions.data, session, onChange])

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(sessions.data?.find((item) => getLessonPlanSessionKey(item) === event.target.value) ?? null)

  if (!date) return null
  if (sessions.status === 'error') return <LoadError what="sessions" onRetry={() => void sessions.refetch()} />
  if (!sessions.data) return <SkeletonRows />
  if (sessions.data.length === 0) return <EmptyMessage icon={CalendarX} title="No lessons on this day" text="Pick another date to plan a session." />

  return (
    <SelectField id={pickerId} label="Group" value={session ? getLessonPlanSessionKey(session) : ''} onChange={handleChange}>
      <option value="">Choose a group</option>
      {sessions.data.map((item) => (
        <option key={getLessonPlanSessionKey(item)} value={getLessonPlanSessionKey(item)}>
          {getLessonPlanSessionLabel(item)}
          {item.rescheduled_from ? ` · Rescheduled from ${formatLessonSlot({ day: item.rescheduled_from.date, time: item.rescheduled_from.start_time })}` : null}
        </option>
      ))}
    </SelectField>
  )
}
