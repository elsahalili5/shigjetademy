import { CalendarX, UserRound } from 'lucide-react'
import type { StudentAttendanceSummary, StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { getStudentName } from '@shigjetademy/shared/students'
import type { UseQueryResult } from '@tanstack/react-query'
import { isApiError } from '#/api/client'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { Detail } from '#/components/HomeDetails'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { ATTENDANCE_STATUS_CHIPS, ATTENDANCE_STATUS_LABELS } from '#/modules/attendance/utils/status-labels'
import { useFormatDay } from '#/lib/use-format-date'
import { useStudentRosterDetail } from '../hooks/use-student-roster-detail'

// A malformed id is refused as invalid; to the person it is a student that doesn't exist or isn't theirs
const NOT_FOUND_STATUSES = [400, 404, 403]

interface StudentDetailPageProps {
  organizationId: string
  studentId: string
}

/** One student's groups shared with this viewer, and their attendance in them */
export function StudentDetailPage({ organizationId, studentId }: StudentDetailPageProps) {
  const detail = useStudentRosterDetail({ organizationId, studentId })
  const isNotFound = isApiError(detail.error) && NOT_FOUND_STATUSES.includes(detail.error.response?.status ?? 0)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={UserRound}
        title={detail.data ? getStudentName(detail.data.student) : 'Student'}
        subtitle="Their attendance in the groups you teach."
        backTo={{ to: '/dashboard/my-students', label: 'Back to Students' }}
      />
      <div className="grid max-w-[880px] min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <StudentDetailContent detail={detail} isNotFound={isNotFound} />
      </div>
    </div>
  )
}

interface StudentDetailContentProps {
  detail: UseQueryResult<StudentRosterDetail>
  isNotFound: boolean
}

function StudentDetailContent({ detail, isNotFound }: StudentDetailContentProps) {
  if (!detail.data) {
    if (isNotFound) return <EmptyMessage icon={UserRound} title="Student not found." text="They may not be in one of your groups, or the link is old." />
    if (detail.status === 'error') return <LoadError what="student" onRetry={() => void detail.refetch()} />
    return <SkeletonRows />
  }

  return (
    <>
      <SectionCard title="Groups">
        <GroupChips groups={detail.data.groups} />
      </SectionCard>
      <SectionCard title="Attendance rate">
        <AttendanceSummary summary={detail.data.summary} />
      </SectionCard>
      <SectionCard title="Attendance history">
        <AttendanceHistory detail={detail.data} />
      </SectionCard>
    </>
  )
}

interface GroupChipsProps {
  groups: StudentRosterDetail['groups']
}

function GroupChips({ groups }: GroupChipsProps) {
  if (groups.length === 0) return <p className="px-5 py-4 text-ink-2">No groups with you right now.</p>
  return (
    <ul className="flex flex-wrap gap-2 px-5 py-4">
      {groups.map((group) => (
        <li key={group.id} className="chip chip--navy">
          {group.name}
        </li>
      ))}
    </ul>
  )
}

interface AttendanceSummaryProps {
  summary: StudentAttendanceSummary
}

function AttendanceSummary({ summary }: AttendanceSummaryProps) {
  if (summary.rate === null) {
    return <p className="px-5 py-4 text-ink-2">No attendance recorded yet.</p>
  }
  return (
    <div className="grid gap-4 px-5 py-4">
      <AttendanceBar summary={summary} />
      <dl className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1 sm:grid-cols-4">
        <Detail term="Rate">
          <span className="tabular">{summary.rate}%</span>
        </Detail>
        <Detail term={ATTENDANCE_STATUS_LABELS.PRESENT}>
          <span className="tabular">{summary.present}</span>
        </Detail>
        <Detail term={ATTENDANCE_STATUS_LABELS.TARDY}>
          <span className="tabular">{summary.tardy}</span>
        </Detail>
        <Detail term={ATTENDANCE_STATUS_LABELS.ABSENT}>
          <span className="tabular">{summary.absent}</span>
        </Detail>
      </dl>
    </div>
  )
}

/** Present, tardy and absent as one proportional bar, next to the counts it summarises rather than standing in for them */
function AttendanceBar({ summary }: AttendanceSummaryProps) {
  const total = summary.present + summary.tardy + summary.absent
  if (total === 0) return null
  const widthOf = (count: number) => `${(count / total) * 100}%`
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-mist"
      role="img"
      aria-label={`${summary.present} ${ATTENDANCE_STATUS_LABELS.PRESENT.toLowerCase()}, ${summary.tardy} ${ATTENDANCE_STATUS_LABELS.TARDY.toLowerCase()}, ${summary.absent} ${ATTENDANCE_STATUS_LABELS.ABSENT.toLowerCase()}`}
    >
      {summary.present > 0 ? <span className="bg-green-deep" style={{ width: widthOf(summary.present) }} /> : null}
      {summary.tardy > 0 ? <span className="bg-kraft-deep" style={{ width: widthOf(summary.tardy) }} /> : null}
      {summary.absent > 0 ? <span className="bg-coral-deep" style={{ width: widthOf(summary.absent) }} /> : null}
    </div>
  )
}

interface AttendanceHistoryProps {
  detail: StudentRosterDetail
}

function AttendanceHistory({ detail }: AttendanceHistoryProps) {
  const formatDay = useFormatDay()
  if (detail.attendance.length === 0) {
    return <EmptyMessage icon={CalendarX} title="No attendance recorded yet" text="Marks from the groups you teach will show up here." />
  }
  return (
    <ul aria-label="Attendance history">
      {detail.attendance.map((entry) => (
        <li key={`${entry.group.id}-${entry.date}-${entry.start_time}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3.5 last:border-b-0">
          <span className="grid gap-0.5 leading-tight">
            <span className="tabular font-semibold">
              {formatDay(entry.date)}, {entry.start_time}
            </span>
            <span className="text-[0.88rem] text-ink-3">{entry.group.name}</span>
          </span>
          <span className={`chip ${ATTENDANCE_STATUS_CHIPS[entry.status]}`}>{ATTENDANCE_STATUS_LABELS[entry.status]}</span>
        </li>
      ))}
    </ul>
  )
}
