import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CalendarX, ClipboardCheck } from 'lucide-react'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useAttendanceGroups } from '../hooks/use-attendance-groups'
import { getAttendanceGroupLabel } from '../utils/group-label'
import { AttendanceRegister } from './attendance-register'

interface AttendancePageProps {
  organizationId: string
  /** The organization's time zone, for what counts as today */
  timeZone: string
}

/** Pick a day, then one of its groups, then take that group's register */
export function AttendancePage({ organizationId, timeZone }: AttendancePageProps) {
  const dateId = useId()
  const [date, setDate] = useState(() => todayIn(timeZone))
  const [groupId, setGroupId] = useState('')

  // Another day has other groups, so the choice starts over
  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value)
    setGroupId('')
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
            <AttendanceGroupPicker organizationId={organizationId} date={date} groupId={groupId} onChange={setGroupId} />
          </div>
        </SectionCard>
        {date && groupId ? <AttendanceRegister organizationId={organizationId} groupId={groupId} date={date} timeZone={timeZone} /> : null}
      </div>
    </div>
  )
}

interface AttendanceGroupPickerProps {
  organizationId: string
  date: string
  groupId: string
  onChange: (groupId: string) => void
}

/** The day's groups to choose from, or why there are none */
function AttendanceGroupPicker({ organizationId, date, groupId, onChange }: AttendanceGroupPickerProps) {
  const pickerId = useId()
  const groups = useAttendanceGroups({ organizationId, date })

  if (!date) return null
  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />
  if (!groups.data) return <SkeletonRows />
  if (groups.data.length === 0) return <EmptyMessage icon={CalendarX} title="No lessons on this day" text="Pick another date to take a register." />

  return (
    <SelectField id={pickerId} label="Group" value={groupId} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose a group</option>
      {groups.data.map((group) => (
        <option key={group.id} value={group.id}>
          {getAttendanceGroupLabel(group)}
        </option>
      ))}
    </SelectField>
  )
}
