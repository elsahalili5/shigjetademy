import { useRef } from 'react'
import type { GroupHandIn } from '@shigjetademy/shared/assignments'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { HandInReviewDialog } from './hand-in-review-dialog'
import { HandInStatusChip } from './hand-in-status-chip'

interface HandInRowProps {
  organizationId: string
  assignmentId: string
  maxPoints: number | null
  canMark: boolean
  row: GroupHandIn
}

/** One student of the group: where their hand-in stands, and a way to open it */
export function HandInRow({ organizationId, assignmentId, maxPoints, canMark, row }: HandInRowProps) {
  const formatDateTime = useFormatDateTime()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const name = fullName(row.student)

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-5 py-3.5 last:border-b-0">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-[0.9rem] text-ink-3">
          {row.student.student_number}
          {row.hand_in ? (
            <>
              {' · '}Handed in <time dateTime={row.hand_in.submitted_at}>{formatDateTime(row.hand_in.submitted_at)}</time>
            </>
          ) : null}
        </p>
      </div>
      <HandInStatusChip status={row.status} />
      {row.hand_in ? (
        <>
          <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" aria-label={`Open ${name}’s hand-in`} onClick={() => dialogRef.current?.showModal()}>
            Open
          </button>
          <HandInReviewDialog dialogRef={dialogRef} organizationId={organizationId} assignmentId={assignmentId} maxPoints={maxPoints} canMark={canMark} row={row} />
        </>
      ) : null}
    </li>
  )
}
