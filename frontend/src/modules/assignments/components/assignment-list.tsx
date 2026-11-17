import { NotebookPen } from 'lucide-react'
import type { Assignment } from '@shigjetademy/shared/assignments'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { AssignmentItem } from './assignment-item'

interface AssignmentListProps {
  organizationId: string
  timeZone: string
  status: 'pending' | 'error' | 'success'
  assignments?: Assignment[]
  onRetry: () => void
}

/** The chosen group's assignments, latest due first */
export function AssignmentList({ organizationId, timeZone, status, assignments, onRetry }: AssignmentListProps) {
  if (status === 'error') return <LoadError what="assignments" onRetry={onRetry} />
  if (!assignments) return <SkeletonRows />
  if (assignments.length === 0) return <EmptyMessage icon={NotebookPen} title="No assignments here yet." text="Assignments set for this group show here." />
  return (
    <ul className="rounded-card border border-rule">
      {assignments.map((assignment) => (
        <AssignmentItem key={assignment.id} organizationId={organizationId} assignment={assignment} timeZone={timeZone} />
      ))}
    </ul>
  )
}
