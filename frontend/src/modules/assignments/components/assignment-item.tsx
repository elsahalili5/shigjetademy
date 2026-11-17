import { useRef, useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Assignment } from '@shigjetademy/shared/assignments'
import { ChatBubbleMenu } from '#/components/ChatBubbleMenu'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useRemoveAssignment } from '../hooks/use-remove-assignment'
import { AssignmentEditDialog } from './assignment-edit-dialog'
import { NO_LATE_HAND_INS_LABEL, getPointsLabel } from '../utils/points'
import { AssignmentFileDownload } from './assignment-file-download'

interface AssignmentItemProps {
  organizationId: string
  assignment: Assignment
  timeZone: string
}

/** One assignment for its setters: title, due moment, points, instructions and file, with edit and remove where the member may */
export function AssignmentItem({ organizationId, assignment, timeZone }: AssignmentItemProps) {
  const formatDateTime = useFormatDateTime()
  const removeAssignment = useRemoveAssignment({ organizationId, assignment })
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const canAct = assignment.can_edit || assignment.can_remove

  const handleRemove = () => removeAssignment.mutate(undefined, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <li className="group/row flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <NotebookPen size={19} strokeWidth={1.8} />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-semibold break-words">
          <Link to="/dashboard/assignments/$assignmentId" params={{ assignmentId: assignment.id }} className="text-ink underline-offset-2 hover:underline">
            {assignment.title}
          </Link>
        </h3>
        <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
          <span>
            Due <time dateTime={assignment.due_at}>{formatDateTime(assignment.due_at)}</time>
          </span>
          <span>{getPointsLabel(assignment.max_points)}</span>
          {assignment.accepts_late_hand_ins ? null : <span>{NO_LATE_HAND_INS_LABEL}</span>}
        </p>
        <p className="whitespace-pre-wrap break-words">{assignment.instructions}</p>
        {assignment.file ? <AssignmentFileDownload organizationId={organizationId} target={{ kind: 'assignment', assignmentId: assignment.id }} file={assignment.file} /> : null}
        {isConfirmingRemove ? (
          <ConfirmGroup label={`Remove ${assignment.title}`} question="Remove this assignment and its hand-ins?" confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} />
        ) : null}
        {removeAssignment.isError ? <FormAlert>{getErrorMessage(removeAssignment.error)}</FormAlert> : null}
      </div>
      {canAct ? (
        <ChatBubbleMenu
          label={`Actions for ${assignment.title}`}
          editLabel="Edit assignment"
          removeLabel="Remove assignment"
          canEdit={assignment.can_edit}
          canRemove={assignment.can_remove}
          isMine
          onEdit={() => editDialogRef.current?.showModal()}
          onRemove={() => setIsConfirmingRemove(true)}
        />
      ) : null}
      {/* Keyed by its last change, so the form opens on what is saved now */}
      {assignment.can_edit ? <AssignmentEditDialog key={assignment.updated_at} dialogRef={editDialogRef} organizationId={organizationId} assignment={assignment} timeZone={timeZone} /> : null}
    </li>
  )
}
