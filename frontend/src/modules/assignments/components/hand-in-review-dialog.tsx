import type { RefObject } from 'react'
import type { AssignmentHandIn, GroupHandIn } from '@shigjetademy/shared/assignments'
import { FormDialog } from '#/components/FormDialog'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getMarkPointsLabel } from '../utils/points'
import { AssignmentFileDownload } from './assignment-file-download'
import { MarkForm } from './mark-form'

interface HandInReviewDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  assignmentId: string
  maxPoints: number | null
  /** The group's setters mark until the group is archived */
  canMark: boolean
  row: GroupHandIn
}

/** What one student handed in, their text and their file, and the mark */
export function HandInReviewDialog({ dialogRef, organizationId, assignmentId, maxPoints, canMark, row }: HandInReviewDialogProps) {
  const formatDateTime = useFormatDateTime()
  const handIn = row.hand_in
  if (!handIn) return null

  return (
    <FormDialog dialogRef={dialogRef} title={`${fullName(row.student)}’s hand-in`} subtitle={`Handed in ${formatDateTime(handIn.submitted_at)}`} onClose={() => dialogRef.current?.close()}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        {handIn.is_late ? <span className="w-fit rounded-full bg-kraft-wash px-2 py-0.5 text-[0.85rem] font-semibold text-kraft-ink">Late</span> : null}
        {handIn.text ? <p className="whitespace-pre-wrap break-words rounded-xl bg-mist px-3.5 py-3">{handIn.text}</p> : null}
        {handIn.file ? <AssignmentFileDownload organizationId={organizationId} target={{ kind: 'hand-in', assignmentId, submissionId: handIn.id }} file={handIn.file} /> : null}
        {canMark ? <MarkForm organizationId={organizationId} assignmentId={assignmentId} maxPoints={maxPoints} handIn={handIn} /> : <SavedMark maxPoints={maxPoints} handIn={handIn} />}
      </div>
    </FormDialog>
  )
}

interface SavedMarkProps {
  maxPoints: number | null
  handIn: AssignmentHandIn
}

/** The mark, read-only once the group is archived */
function SavedMark({ maxPoints, handIn }: SavedMarkProps) {
  if (!handIn.mark) return <p className="text-ink-2">Not marked.</p>
  return (
    <div className="grid gap-1 border-t border-rule pt-4">
      {handIn.mark.points !== null && maxPoints !== null ? <p className="font-semibold">{getMarkPointsLabel({ points: handIn.mark.points, maxPoints })}</p> : null}
      {handIn.mark.feedback ? <p className="whitespace-pre-wrap break-words">{handIn.mark.feedback}</p> : null}
    </div>
  )
}
