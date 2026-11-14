import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'

import { DISCUSSION_REPLY_MAX_LENGTH } from '@shigjetademy/shared/discussions'
import type { DiscussionReply } from '@shigjetademy/shared/discussions'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatTime } from '#/lib/use-format-date'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useRemoveDiscussionReply } from '../hooks/use-remove-discussion-reply'
import { useUpdateDiscussionReply } from '../hooks/use-update-discussion-reply'
import { getRemovedLabel } from '../utils/removed-label'
import { DiscussionBubble } from './discussion-bubble'
import { DiscussionReplyMenu } from './discussion-reply-menu'

interface DiscussionReplyItemProps {
  organizationId: string
  topicId: string
  reply: DiscussionReply
  /** True for the signed-in member's own replies, shown on the right */
  isMine: boolean
  isFirstInRun: boolean
  isLastInRun: boolean
  /** The newest post, which scrolls into view when it appears */
  isLatest: boolean
}

/** Scrolls the newest post into view when it appears; a stable function, so older posts are left where the reader has scrolled to */
const scrollIntoViewOnMount = (node: HTMLElement | null) => node?.scrollIntoView({ block: 'nearest' })

/** One reply as a chat bubble: its words (or that it was removed), when it was sent, and edit and remove where the member may */
export function DiscussionReplyItem({ organizationId, topicId, reply, isMine, isFirstInRun, isLastInRun, isLatest }: DiscussionReplyItemProps) {
  const formatTime = useFormatTime()
  const removeReply = useRemoveDiscussionReply({ organizationId, topicId })
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  const handleRemove = () => removeReply.mutate(reply.id, { onSettled: () => setIsConfirmingRemove(false) })
  const canAct = (reply.can_edit || reply.can_remove) && !isEditing

  return (
    <li ref={isLatest ? scrollIntoViewOnMount : undefined} className="group/row">
      <DiscussionBubble
        author={reply.author}
        isMine={isMine}
        isFirstInRun={isFirstInRun}
        isLastInRun={isLastInRun}
        isWide={isEditing}
        meta={
          <>
            {reply.edited_at && reply.status === 'ACTIVE' ? <span>(edited)</span> : null}
            <time dateTime={reply.created_at}>{formatTime(reply.created_at)}</time>
          </>
        }
        menu={canAct ? <DiscussionReplyMenu canEdit={reply.can_edit} canRemove={reply.can_remove} isMine={isMine} onEdit={() => setIsEditing(true)} onRemove={() => setIsConfirmingRemove(true)} /> : null}
        actions={
          <>
            {removeReply.isError ? <FormAlert>{getErrorMessage(removeReply.error)}</FormAlert> : null}
            {isConfirmingRemove ? <ConfirmGroup label="Remove this reply" question="Remove this reply?" confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} /> : null}
          </>
        }
      >
        <ReplyText organizationId={organizationId} topicId={topicId} reply={reply} isEditing={isEditing} isMine={isMine} onDone={() => setIsEditing(false)} />
      </DiscussionBubble>
    </li>
  )
}

interface ReplyTextProps {
  organizationId: string
  topicId: string
  reply: DiscussionReply
  isEditing: boolean
  isMine: boolean
  onDone: () => void
}

/** A reply's words, the edit box while it is being changed, or that it was removed */
function ReplyText({ organizationId, topicId, reply, isEditing, isMine, onDone }: ReplyTextProps) {
  if (reply.status === 'REMOVED') return <p className={`italic ${isMine ? 'text-white/80' : 'text-ink-3'}`}>{getRemovedLabel(reply.removed_by)}</p>
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
    <form className="grid gap-2 text-ink" noValidate onSubmit={handleSubmit}>
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
