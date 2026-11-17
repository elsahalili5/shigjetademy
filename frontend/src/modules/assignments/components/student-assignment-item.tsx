import { useRef } from 'react'
import { NotebookPen } from 'lucide-react'
import type { AssignmentHandIn, StudentAssignment } from '@shigjetademy/shared/assignments'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getMarkPointsLabel, getPointsLabel } from '../utils/points'
import { AssignmentFileDownload } from './assignment-file-download'
import { HandInDialog } from './hand-in-dialog'

interface StudentAssignmentItemProps {
  organizationId: string
  assignment: StudentAssignment
}

/** One assignment for its student: what to do and by when, what they handed in, and a way to hand in until it is marked */
export function StudentAssignmentItem({ organizationId, assignment }: StudentAssignmentItemProps) {
  const formatDateTime = useFormatDateTime()
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <li className="flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <NotebookPen size={19} strokeWidth={1.8} />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-semibold break-words">{assignment.title}</h3>
        <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
          <span>
            {assignment.group.name} · {assignment.group.course_name}
          </span>
          <span>
            Due <time dateTime={assignment.due_at}>{formatDateTime(assignment.due_at)}</time>
          </span>
          <span>{getPointsLabel(assignment.max_points)}</span>
        </p>
        <p className="whitespace-pre-wrap break-words">{assignment.instructions}</p>
        {assignment.file ? <AssignmentFileDownload organizationId={organizationId} target={{ kind: 'assignment', assignmentId: assignment.id }} file={assignment.file} /> : null}
        {assignment.is_closed ? (
          <p className="w-fit rounded-full bg-kraft-wash px-2 py-0.5 text-[0.85rem] font-semibold text-kraft-ink">Closed</p>
        ) : null}
        {assignment.hand_in ? <HandInSummary organizationId={organizationId} assignmentId={assignment.id} maxPoints={assignment.max_points} handIn={assignment.hand_in} /> : null}
        {assignment.can_hand_in ? (
          <button
            type="button"
            className="button button--primary mt-1 min-h-9 w-fit px-3.5 text-[0.95rem]"
            aria-label={assignment.hand_in ? `Replace hand-in for ${assignment.title}` : `Hand in ${assignment.title}`}
            onClick={() => dialogRef.current?.showModal()}
          >
            {assignment.hand_in ? 'Replace hand-in' : 'Hand in'}
          </button>
        ) : null}
      </div>
      {/* Keyed by the last hand-in, so the form opens on what was handed in */}
      {assignment.can_hand_in ? <HandInDialog key={assignment.hand_in?.submitted_at ?? 'new'} dialogRef={dialogRef} organizationId={organizationId} assignment={assignment} /> : null}
    </li>
  )
}

interface HandInSummaryProps {
  organizationId: string
  assignmentId: string
  maxPoints: number | null
  handIn: AssignmentHandIn
}

/** What the student handed in and when, flagged when it came after the due date */
function HandInSummary({ organizationId, assignmentId, maxPoints, handIn }: HandInSummaryProps) {
  const formatDateTime = useFormatDateTime()
  return (
    <div className="mt-1 grid gap-1.5 rounded-xl bg-mist px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-2 text-[0.93rem] text-ink-2">
        Handed in <time dateTime={handIn.submitted_at}>{formatDateTime(handIn.submitted_at)}</time>
        {handIn.is_late ? <span className="rounded-full bg-kraft-wash px-2 py-0.5 text-[0.85rem] font-semibold text-kraft-ink">Late</span> : null}
      </p>
      {handIn.text ? <p className="whitespace-pre-wrap break-words">{handIn.text}</p> : null}
      {handIn.file ? <AssignmentFileDownload organizationId={organizationId} target={{ kind: 'hand-in', assignmentId, submissionId: handIn.id }} file={handIn.file} /> : null}
      {handIn.mark ? (
        <div className="grid gap-1 border-t border-rule pt-2">
          <p className="text-[0.93rem] font-semibold text-green-deep">Marked</p>
          {handIn.mark.points !== null && maxPoints !== null ? <p className="font-semibold">{getMarkPointsLabel({ points: handIn.mark.points, maxPoints })}</p> : null}
          {handIn.mark.feedback ? <p className="whitespace-pre-wrap break-words">{handIn.mark.feedback}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
