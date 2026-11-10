import { useEffect, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { Group } from '@shigjetademy/shared/groups'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useAcademicYears } from '#/modules/academic-periods/hooks/use-academic-years'
import { useCourseOptions } from '#/modules/courses/hooks/use-course-options'
import { GroupDialog } from '#/modules/groups/components/group-dialog'
import type { GroupDialogMode, GroupFormOptions } from '#/modules/groups/components/group-dialog'
import { useGroup } from '#/modules/groups/hooks/use-group'
import { useGroupLecturerOptions } from '#/modules/groups/hooks/use-group-lecturer-options'
import { useRooms } from '#/modules/locations/hooks/use-rooms'
import { useWeeklySchedule } from '../hooks/use-weekly-schedule'
import { WeeklyScheduleGrid } from './weekly-schedule-grid'

interface SchedulePageProps {
  organizationId: string
  /** The organization's week, so the grid starts on its first day */
  weekStart: WeekStart
  /** The organization's time zone, for the day a change of lecturer starts by default */
  timeZone: string
}

/** The organization's weekly timetable, assembled from every active group's meetings, with room and teacher clashes flagged; a meeting opens its group */
export function SchedulePage({ organizationId, weekStart, timeZone }: SchedulePageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const schedule = useWeeklySchedule(organizationId)
  const courses = useCourseOptions(organizationId)
  const years = useAcademicYears(organizationId)
  const rooms = useRooms(organizationId)
  const lecturers = useGroupLecturerOptions({ organizationId })
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const openGroup = useGroup({ organizationId, groupId: openGroupId ?? '', isEnabled: !!openGroupId })
  const [dialogMode, setDialogMode] = useState<GroupDialogMode>({ kind: 'add', openCount: 0 })

  const formOptions: GroupFormOptions = { courses: courses.data ?? [], years: years.data ?? [], rooms: rooms.data ?? [], lecturers: lecturers.data ?? [] }

  // The dialog opens once the clicked group has loaded, since it needs the full group to pre-fill the form
  useEffect(() => {
    if (openGroup.data) {
      setDialogMode((current) => ({ kind: 'edit', group: openGroup.data as Group, openCount: current.openCount + 1 }))
      dialogRef.current?.showModal()
    }
  }, [openGroup.data])

  const handleSelectGroup = (groupId: string) => setOpenGroupId(groupId)

  const handleClose = () => setOpenGroupId(null)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={CalendarClock} title="Timetable" subtitle="The organization’s week: rooms, teachers and clashes at a glance." />

      <div className="grid min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard title="Week">
          <ScheduleContent status={schedule.status} schedule={schedule.data} weekStart={weekStart} onRetry={() => void schedule.refetch()} onSelectGroup={handleSelectGroup} />
        </SectionCard>
      </div>

      <GroupDialog dialogRef={dialogRef} organizationId={organizationId} mode={dialogMode} options={formOptions} timeZone={timeZone} onSaved={handleClose} />
    </div>
  )
}

interface ScheduleContentProps {
  status: 'pending' | 'error' | 'success'
  schedule?: WeeklyScheduleEntry[]
  weekStart: WeekStart
  onRetry: () => void
  onSelectGroup: (groupId: string) => void
}

function ScheduleContent({ status, schedule, weekStart, onRetry, onSelectGroup }: ScheduleContentProps) {
  if (status === 'error') return <LoadError what="schedule" onRetry={onRetry} />
  if (!schedule) return <SkeletonRows />
  if (schedule.length === 0) return <EmptyMessage icon={CalendarClock} title="No meetings yet." text="Meetings show here once groups have a weekly schedule." />

  return <WeeklyScheduleGrid schedule={schedule} weekStart={weekStart} onSelectGroup={onSelectGroup} />
}
