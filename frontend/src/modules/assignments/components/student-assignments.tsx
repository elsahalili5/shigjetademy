import { useId } from 'react'
import { NotebookPen } from 'lucide-react'
import type { StudentAssignment } from '@shigjetademy/shared/assignments'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useMyAssignments } from '../hooks/use-my-assignments'
import { splitStudentAssignments } from '../utils/student-sections'
import { StudentAssignmentItem } from './student-assignment-item'

interface StudentAssignmentsProps {
  organizationId: string
}

/** For students: every group's assignments in one place, To do first and Done under it */
export function StudentAssignments({ organizationId }: StudentAssignmentsProps) {
  const assignments = useMyAssignments(organizationId)

  if (assignments.status === 'error') return <LoadError what="assignments" onRetry={() => void assignments.refetch()} />
  if (!assignments.data) return <SkeletonRows />
  if (assignments.data.length === 0) return <EmptyMessage icon={NotebookPen} title="No assignments yet." text="Assignments set for your groups show here." />
  const { toDo, done } = splitStudentAssignments(assignments.data)
  return (
    <div className="grid gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
      <StudentAssignmentSection organizationId={organizationId} title="To do" emptyText="Nothing to hand in right now." assignments={toDo} />
      <StudentAssignmentSection organizationId={organizationId} title="Done" emptyText="Nothing handed in yet." assignments={done} />
    </div>
  )
}

interface StudentAssignmentSectionProps {
  organizationId: string
  title: string
  emptyText: string
  assignments: StudentAssignment[]
}

function StudentAssignmentSection({ organizationId, title, emptyText, assignments }: StudentAssignmentSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2.5 font-data text-[0.84rem] tracking-[0.06em] text-ink-2 uppercase">
        {title}
      </h2>
      {assignments.length === 0 ? (
        <p className="rounded-card border border-rule px-5 py-4 text-ink-2">{emptyText}</p>
      ) : (
        <ul className="rounded-card border border-rule">
          {assignments.map((assignment) => (
            <StudentAssignmentItem key={assignment.id} organizationId={organizationId} assignment={assignment} />
          ))}
        </ul>
      )}
    </section>
  )
}
