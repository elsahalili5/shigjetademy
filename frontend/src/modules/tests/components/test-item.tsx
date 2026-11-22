import { useRef, useState } from 'react'
import { FileQuestion } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Test } from '@shigjetademy/shared/tests'
import { ChatBubbleMenu } from '#/components/ChatBubbleMenu'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useRemoveTest } from '../hooks/use-remove-test'
import { getPointsLabel } from '../utils/points'
import { TestEditDialog } from './test-edit-dialog'

interface TestItemProps {
  organizationId: string
  test: Test
  timeZone: string
}

/** One test for its setters: title, when it is held, points and description, with edit and remove where the member may */
export function TestItem({ organizationId, test, timeZone }: TestItemProps) {
  const formatDateTime = useFormatDateTime()
  const removeTest = useRemoveTest({ organizationId, test })
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const canAct = test.can_edit || test.can_remove

  const handleRemove = () => removeTest.mutate(undefined, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <li className="group/row flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <FileQuestion size={19} strokeWidth={1.8} />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-semibold break-words">
          <Link to="/dashboard/tests/$testId" params={{ testId: test.id }} className="text-ink underline-offset-2 hover:underline">
            {test.title}
          </Link>
        </h3>
        <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
          <time dateTime={test.held_at}>{formatDateTime(test.held_at)}</time>
          <span>{getPointsLabel(test.max_points)}</span>
        </p>
        {test.description ? <p className="whitespace-pre-wrap break-words">{test.description}</p> : null}
        {isConfirmingRemove ? (
          <ConfirmGroup label={`Remove ${test.title}`} question="Remove this test and its results?" confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} />
        ) : null}
        {removeTest.isError ? <FormAlert>{getErrorMessage(removeTest.error)}</FormAlert> : null}
      </div>
      {canAct ? (
        <ChatBubbleMenu
          label={`Actions for ${test.title}`}
          editLabel="Edit test"
          removeLabel="Remove test"
          canEdit={test.can_edit}
          canRemove={test.can_remove}
          isMine
          onEdit={() => editDialogRef.current?.showModal()}
          onRemove={() => setIsConfirmingRemove(true)}
        />
      ) : null}
      {/* Keyed by its last change, so the form opens on what is saved now */}
      {test.can_edit ? <TestEditDialog key={test.updated_at} dialogRef={editDialogRef} organizationId={organizationId} test={test} timeZone={timeZone} /> : null}
    </li>
  )
}
