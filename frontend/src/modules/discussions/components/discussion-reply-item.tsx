import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { DISCUSSION_REPLY_MAX_LENGTH } from '@shigjetademy/shared/discussions'
import type { DiscussionReply } from '@shigjetademy/shared/discussions'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useRemoveDiscussionReply } from '../hooks/use-remove-discussion-reply'
import { useUpdateDiscussionReply } from '../hooks/use-update-discussion-reply'
import { getRemovedLabel } from '../utils/removed-label'

interface DiscussionReplyItemProps {
  organizationId: string
  topicId: string
  reply: DiscussionReply
}

/** One reply: who wrote it and when, its text (or that it was removed), and edit and remove where the member may */
export function DiscussionReplyItem({ organizationId, topicId, reply }: DiscussionReplyItemProps) {
  const formatDateTime = useFormatDateTime()
  const removeReply = useRemoveDiscussionReply({ organizationId, topicId })
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  const handleRemove = () => removeReply.mutate(reply.id, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <li className="grid gap-1.5 border-b border-rule px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-2 text-[0.9rem] text-ink-3">
        <span className="font-semibold text-ink">{fullName(reply.author)}</span>
        <time dateTime={reply.created_at}>{formatDateTime(reply.created_at)}</time>
        {reply.edited_at && reply.status === 'ACTIVE' ? <span>(edited)</span> : null}
      </div>
      <ReplyText organizationId={organizationId} topicId={topicId} reply={reply} isEditing={isEditing} onDone={() => setIsEditing(false)} />
      {removeReply.isError ? <FormAlert>{getErrorMessage(removeReply.error)}</FormAlert> : null}
      {(reply.can_edit || reply.can_remove) && !isEditing ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {reply.can_edit ? (
            <button type="button" className="button button--ghost min-h-9 px-3 text-[0.9rem]" onClick={() => setIsEditing(true)}>
              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
              Edit reply
            </button>
          ) : null}
          {reply.can_remove ? <RemoveReplyButton isConfirming={isConfirmingRemove} onAsk={() => setIsConfirmingRemove(true)} onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} /> : null}
        </div>
      ) : null}
    </li>
  )
}

interface ReplyTextProps {
  organizationId: string
  topicId: string
  reply: DiscussionReply
  isEditing: boolean
  onDone: () => void
}

/** A reply's words, the edit box while it is being changed, or that it was removed */
function ReplyText({ organizationId, topicId, reply, isEditing, onDone }: ReplyTextProps) {
  if (reply.status === 'REMOVED') return <p className="text-ink-3 italic">{getRemovedLabel(reply.removed_by)}</p>
  if (isEditing) return <EditReplyForm organizationId={organizationId} topicId={topicId} reply={reply} onDone={onDone} />
  return <p className="whitespace-pre-wrap break-words">{reply.body}</p>
}

interface EditReplyFormProps {
  organizationId: string
  topicId: string
  reply: DiscussionReply
  onDone: () => void
}

function EditReplyForm({ organizationId, topicId, reply, onDone }: EditReplyFormProps) {
  const [text, setText] = useState(reply.body)
  const updateReply = useUpdateDiscussionReply({ organizationId, topicId })
  const inputId = useId()
  const body = text.trim()

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body) return
    updateReply.mutate({ replyId: reply.id, body }, { onSuccess: onDone })
  }

  return (
    <form className="grid gap-2" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        Edit reply
      </label>
      <textarea id={inputId} className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`} maxLength={DISCUSSION_REPLY_MAX_LENGTH} value={text} disabled={updateReply.isPending} onChange={(event) => setText(event.target.value)} />
      {updateReply.isError ? <FormAlert>{getErrorMessage(updateReply.error)}</FormAlert> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-9 px-3.5 text-[0.95rem]" disabled={updateReply.isPending || !body}>
          {updateReply.isPending ? 'Saving…' : 'Save reply'}
        </button>
      </div>
    </form>
  )
}

interface RemoveReplyButtonProps {
  isConfirming: boolean
  onAsk: () => void
  onConfirm: () => void
  onCancel: () => void
}

/** Remove, which asks once before it goes ahead */
function RemoveReplyButton({ isConfirming, onAsk, onConfirm, onCancel }: RemoveReplyButtonProps) {
  if (isConfirming) return <ConfirmGroup label="Remove this reply" question="Remove this reply?" confirmLabel="Remove" onConfirm={onConfirm} onCancel={onCancel} />
  return (
    <button type="button" className="button button--ghost min-h-9 px-3 text-[0.9rem]" onClick={onAsk}>
      <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
      Remove reply
    </button>
  )
}
