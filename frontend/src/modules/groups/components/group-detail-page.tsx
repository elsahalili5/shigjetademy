import { Link } from '@tanstack/react-router'
import { ArrowLeft, UsersRound } from 'lucide-react'
import type { Group } from '@shigjetademy/shared/groups'
import { isApiError } from '#/api/client'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { Detail } from '#/components/HomeDetails'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isCoursesManager } from '#/modules/courses/utils/permissions'
import { useGroup } from '../hooks/use-group'
import { useGroupLecturerOptions } from '../hooks/use-group-lecturer-options'
import { getEnrolmentCountLabel } from '../utils/enrolment-count'
import { getScheduleEntryKey, getScheduleEntryLabel } from '../utils/schedule-label'
import { GroupLecturersContent } from './group-lecturers-content'
import { GroupReschedulesSection } from './group-reschedules-section'
import { GroupStudentsSection } from './group-students-section'

// A malformed id is refused as invalid; to the person it is a group that doesn't exist
const NOT_FOUND_STATUSES = [400, 404]

const getSeats = (capacity: number) => (capacity === 1 ? '1 seat' : `${capacity} seats`)

interface GroupDetailPageProps {
  organizationId: string
  groupId: string
  /** The organization's time zone, for what counts as today */
  timeZone: string
}

/** Everything about one group: its details, its weekly schedule, its moved lessons and who teaches and covers it */
export function GroupDetailPage({ organizationId, groupId, timeZone }: GroupDetailPageProps) {
  const group = useGroup({ organizationId, groupId })
  const isNotFound = isApiError(group.error) && NOT_FOUND_STATUSES.includes(group.error.response?.status ?? 0)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={UsersRound} title={group.data?.name ?? 'Group'} subtitle={group.data ? `${group.data.course.name} · ${group.data.academic_year.name}` : 'A class you run'}>
        <Link className="button button--ghost min-h-11 px-4 text-base" to="/dashboard/groups">
          <ArrowLeft size={17} strokeWidth={2.2} aria-hidden="true" />
          Back to Groups
        </Link>
      </DashboardPageHeader>
      <div className="grid max-w-[880px] min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <GroupDetailContent organizationId={organizationId} group={group.data} status={group.status} isNotFound={isNotFound} timeZone={timeZone} onRetry={() => void group.refetch()} />
      </div>
    </div>
  )
}

interface GroupDetailContentProps {
  organizationId: string
  group?: Group
  status: 'pending' | 'error' | 'success'
  isNotFound: boolean
  timeZone: string
  onRetry: () => void
}

function GroupDetailContent({ organizationId, group, status, isNotFound, timeZone, onRetry }: GroupDetailContentProps) {
  const membership = useActiveMembership()
  // Timetable admins read the group and move its lessons; its students and lecturers stay with course managers
  const canManage = isCoursesManager(membership)

  // A failed refetch, like the one after enrolling, keeps the page that's already loaded
  if (!group) {
    if (isNotFound) return <EmptyMessage icon={UsersRound} title="Group not found." text="It may belong to another organization, or the link is old." />
    if (status === 'error') return <LoadError what="group" onRetry={onRetry} />
    return <SkeletonRows />
  }

  return (
    <>
      <SectionCard title="Details">
        <dl className="grid grid-cols-2 gap-4 px-5 py-4 max-[560px]:grid-cols-1">
          <Detail term="Course">{group.course.name}</Detail>
          <Detail term="School year">{group.academic_year.name}</Detail>
          <Detail term="Term">{group.academic_term?.name ?? <NotSet text="No term" />}</Detail>
          <Detail term="Location">{group.location?.name ?? <NotSet text="No location" />}</Detail>
          <Detail term="Capacity">{group.capacity === null ? <NotSet text="No limit" /> : getSeats(group.capacity)}</Detail>
          <Detail term="Students">
            <span className="tabular">{getEnrolmentCountLabel(group)}</span>
          </Detail>
        </dl>
      </SectionCard>
      <SectionCard title="Schedule">
        <GroupSchedule group={group} />
      </SectionCard>
      <GroupReschedulesSection organizationId={organizationId} group={group} timeZone={timeZone} />
      {canManage ? (
        <>
          <SectionCard title="Students">
            <GroupStudentsSection organizationId={organizationId} group={group} />
          </SectionCard>
          <SectionCard title="Lecturers">
            <GroupLecturersSection organizationId={organizationId} group={group} timeZone={timeZone} />
          </SectionCard>
        </>
      ) : null}
    </>
  )
}

interface GroupScheduleProps {
  group: Group
}

/** The weekly days and times, in the organization's week as the server orders them */
function GroupSchedule({ group }: GroupScheduleProps) {
  if (group.schedule.length === 0) return <p className="px-5 py-4 text-ink-2">No schedule</p>
  return (
    <ul className="grid" aria-label="Schedule">
      {group.schedule.map((entry) => (
        <li key={getScheduleEntryKey(entry)} className="tabular border-b border-rule px-5 py-3 last:border-b-0">
          {getScheduleEntryLabel(entry)}
        </li>
      ))}
    </ul>
  )
}

interface GroupLecturersSectionProps {
  organizationId: string
  group: Group
  timeZone: string
}

function GroupLecturersSection({ organizationId, group, timeZone }: GroupLecturersSectionProps) {
  const lecturers = useGroupLecturerOptions({ organizationId })
  return <GroupLecturersContent organizationId={organizationId} group={group} lecturers={lecturers.data ?? []} timeZone={timeZone} />
}

interface NotSetProps {
  text: string
}

function NotSet({ text }: NotSetProps) {
  return <span className="font-normal text-ink-2">{text}</span>
}
