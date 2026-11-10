import { useEffect, useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CalendarX, ClipboardCheck } from 'lucide-react'
import type { AttendanceSession } from '@shigjetademy/shared/attendance'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatLessonSlot } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useAttendanceSessions } from '../hooks/use-attendance-sessions'
import { getAttendanceSessionKey, getAttendanceSessionLabel } from '../utils/session-label'
import { AttendanceHistory } from './attendance-history'
import { AttendanceRegister } from './attendance-register'

interface AttendancePageProps {
  organizationId: string
  /** The organization's time zone, for what counts as today */
  timeZone: string
}

/** Pick a day, then one of its lesson sessions, then take that session's register */
export function AttendancePage({ organizationId, timeZone }: AttendancePageProps) {
  const dateId = useId()
  const [date, setDate] = useState(() => todayIn(timeZone))
  const [session, setSession] = useState<AttendanceSession | null>(null)

  // Another day has other sessions, so the choice starts over
  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value)
    setSession(null)
  }

  const handleSelectHistory = ({ date: historyDate, session: historySession }: { date: string; session: AttendanceSession }) => {
    setDate(historyDate)
    setSession(historySession)
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={ClipboardCheck} title="Attendance" subtitle="Take the register for a group’s lesson." />

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard title="Lesson">
          <div className="grid gap-4 px-5 py-4">
            <div className="max-w-xs">
              <AuthField id={dateId} label="Date" type="date" value={date} onChange={handleDateChange} />
            </div>
            <AttendanceSessionPicker organizationId={organizationId} date={date} session={session} onChange={setSession} />
          </div>
        </SectionCard>
        <SectionCard title="Attendance history">
          <AttendanceHistory organizationId={organizationId} onSelect={handleSelectHistory} />
        </SectionCard>
        {date && session ? <AttendanceRegister organizationId={organizationId} groupId={session.group_id} date={date} startTime={session.start_time} timeZone={timeZone} /> : null}
      </div>
    </div>
  )
}

interface AttendanceSessionPickerProps {
  organizationId: string
  date: string
  session: AttendanceSession | null
  onChange: (session: AttendanceSession | null) => void
}

/** The day's sessions to choose from, one per group and start time, or why there are none */
function AttendanceSessionPicker({ organizationId, date, session, onChange }: AttendanceSessionPickerProps) {
  const pickerId = useId()
  const sessions = useAttendanceSessions({ organizationId, date })
  const formatLessonSlot = useFormatLessonSlot()

  // The day's only session needs no manual pick; a day with none or several still does
  useEffect(() => {
    if (session === null && sessions.data?.length === 1) onChange(sessions.data[0])
  }, [sessions.data, session, onChange])

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(sessions.data?.find((item) => getAttendanceSessionKey(item) === event.target.value) ?? null)

  if (!date) return null
  if (sessions.status === 'error') return <LoadError what="groups" onRetry={() => void sessions.refetch()} />
  if (!sessions.data) return <SkeletonRows />
  if (sessions.data.length === 0) return <EmptyMessage icon={CalendarX} title="No lessons on this day" text="Pick another date to take a register." />

  return (
    <SelectField id={pickerId} label="Group" value={session ? getAttendanceSessionKey(session) : ''} onChange={handleChange}>
      <option value="">Choose a group</option>
      {sessions.data.map((item) => (
        <option key={getAttendanceSessionKey(item)} value={getAttendanceSessionKey(item)}>
          {getAttendanceSessionLabel(item)}
          {item.rescheduled_from ? ` · Rescheduled from ${formatLessonSlot({ day: item.rescheduled_from.date, time: item.rescheduled_from.start_time })}` : null}
        </option>
      ))}
    </SelectField>
  )
}
