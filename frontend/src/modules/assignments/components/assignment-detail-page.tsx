import { NotebookPen } from 'lucide-react'
import type { AssignmentDetail } from '@shigjetademy/shared/assignments'
import { isApiError } from '#/api/client'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useAssignmentDetail } from '../hooks/use-assignment-detail'
import { NO_LATE_HAND_INS_LABEL, getPointsLabel } from '../utils/points'
import { AssignmentFileDownload } from './assignment-file-download'
import { HandInRow } from './hand-in-row'

// A malformed id is refused as invalid; to the person it is an assignment that doesn't exist
const NOT_FOUND_STATUSES = [400, 404]

interface AssignmentDetailPageProps {
  organizationId: string
  assignmentId: string
}

/** One assignment for its setters: what was set, and every student of the group with their hand-in */
export function AssignmentDetailPage({ organizationId, assignmentId }: AssignmentDetailPageProps) {
  const formatDateTime = useFormatDateTime()
  const detail = useAssignmentDetail({ organizationId, assignmentId })
  const isNotFound = isApiError(detail.error) && NOT_FOUND_STATUSES.includes(detail.error.response?.status ?? 0)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={NotebookPen}
        title={detail.data?.title ?? 'Assignment'}
        subtitle={detail.data ? `${detail.data.group.name} · ${detail.data.group.course_name} · Due ${formatDateTime(detail.data.due_at)}` : 'Homework for a group'}
        backTo={{ to: '/dashboard/assignments', label: 'Back to Assignments' }}
      />
      <div className="grid max-w-[880px] min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <AssignmentDetailContent organizationId={organizationId} detail={detail.data} status={detail.status} isNotFound={isNotFound} onRetry={() => void detail.refetch()} />
      </div>
    </div>
  )
}

interface AssignmentDetailContentProps {
  organizationId: string
  detail?: AssignmentDetail
  status: 'pending' | 'error' | 'success'
  isNotFound: boolean
  onRetry: () => void
}

function AssignmentDetailContent({ organizationId, detail, status, isNotFound, onRetry }: AssignmentDetailContentProps) {
  if (!detail) {
    if (isNotFound) return <EmptyMessage icon={NotebookPen} title="Assignment not found." text="It may have been removed, or the link is old." />
    if (status === 'error') return <LoadError what="assignment" onRetry={onRetry} />
    return <SkeletonRows />
  }

  return (
    <>
      <SectionCard title="Instructions">
        <div className="grid gap-3 px-5 py-4">
          <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
            <span>{getPointsLabel(detail.max_points)}</span>
            {detail.accepts_late_hand_ins ? null : <span>{NO_LATE_HAND_INS_LABEL}</span>}
          </p>
          <p className="whitespace-pre-wrap break-words">{detail.instructions}</p>
          {detail.file ? <AssignmentFileDownload organizationId={organizationId} target={{ kind: 'assignment', assignmentId: detail.id }} file={detail.file} /> : null}
        </div>
      </SectionCard>
      <SectionCard title="Hand-ins">
        {detail.hand_ins.length === 0 ? (
          <EmptyMessage icon={NotebookPen} title="No students in this group." text="Students enrolled in the group show here with their hand-ins." />
        ) : (
          <ul aria-label="Hand-ins">
            {detail.hand_ins.map((row) => (
              <HandInRow key={row.student.id} organizationId={organizationId} assignmentId={detail.id} maxPoints={detail.max_points} canMark={detail.can_edit} row={row} />
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  )
}
