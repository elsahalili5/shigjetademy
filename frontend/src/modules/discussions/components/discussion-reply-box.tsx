import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { DISCUSSION_REPLY_MAX_LENGTH } from '@shigjetademy/shared/discussions'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useReplyToDiscussion } from '../hooks/use-reply-to-discussion'

interface DiscussionReplyBoxProps {
  organizationId: string
  topicId: string
  /** Why the member can't reply here, or null when they can */
  blockedHint: string | null
}

/** The reply box under a topic; when the member can't reply, a hint says why in its place */
export function DiscussionReplyBox({ organizationId, topicId, blockedHint }: DiscussionReplyBoxProps) {
  const [text, setText] = useState('')
  const replyToDiscussion = useReplyToDiscussion({ organizationId, topicId })
  const inputId = useId()
  const body = text.trim()

  if (blockedHint) {
    return (
      <p className="border-t border-rule bg-mist/60 px-5 py-4 text-[0.95rem] text-ink-2" role="note">
        {blockedHint}
      </p>
    )
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body) return
    replyToDiscussion.mutate({ body }, { onSuccess: () => setText('') })
  }

  return (
    <form className="grid gap-3 border-t border-rule px-5 py-4" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        Reply
      </label>
      <textarea
        id={inputId}
        className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`}
        placeholder="Write a reply…"
        maxLength={DISCUSSION_REPLY_MAX_LENGTH}
        value={text}
        disabled={replyToDiscussion.isPending}
        onChange={(event) => setText(event.target.value)}
      />
      {replyToDiscussion.isError ? <FormAlert>{getErrorMessage(replyToDiscussion.error)}</FormAlert> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.87rem] text-ink-3" aria-hidden="true">
          {text.length}/{DISCUSSION_REPLY_MAX_LENGTH}
        </span>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={replyToDiscussion.isPending || !body}>
          <SendHorizontal size={17} strokeWidth={2} aria-hidden="true" />
          {replyToDiscussion.isPending ? 'Sending…' : 'Reply'}
        </button>
      </div>
    </form>
  )
}
