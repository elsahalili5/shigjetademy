import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, SubmitEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { DISCUSSION_REPLY_MAX_LENGTH } from '@shigjetademy/shared/discussions'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useReplyToDiscussion } from '../hooks/use-reply-to-discussion'

/** The counter shows once the reply is this close to the limit */
const COUNTER_SHOWN_FROM = Math.floor(DISCUSSION_REPLY_MAX_LENGTH * 0.8)
const INPUT_MAX_HEIGHT_PX = 140

interface DiscussionReplyBoxProps {
  organizationId: string
  topicId: string
  /** Why the member can't reply here, or null when they can */
  blockedHint: string | null
}

/** The reply bar under a topic: a growing box and a round send button, Enter sends and Shift+Enter starts a new line; when the member can't reply, a hint says why in its place */
export function DiscussionReplyBox({ organizationId, topicId, blockedHint }: DiscussionReplyBoxProps) {
  const [text, setText] = useState('')
  const replyToDiscussion = useReplyToDiscussion({ organizationId, topicId })
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const body = text.trim()

  if (blockedHint) {
    return (
      <p className="border-t border-rule bg-mist/60 px-5 py-4 text-[0.95rem] text-ink-2" role="note">
        {blockedHint}
      </p>
    )
  }

  const fitInput = (input: HTMLTextAreaElement) => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body || replyToDiscussion.isPending) return
    replyToDiscussion.mutate(
      { body },
      {
        onSuccess: () => {
          setText('')
          if (inputRef.current) fitInput(inputRef.current)
        },
      },
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className="grid gap-2 border-t border-rule bg-white px-4 py-3" noValidate onSubmit={handleSubmit}>
      {replyToDiscussion.isError ? <FormAlert>{getErrorMessage(replyToDiscussion.error)}</FormAlert> : null}
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor={inputId}>
          Reply
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={1}
          className="max-h-[140px] min-h-11 flex-1 resize-none rounded-[22px] border border-rule-strong bg-mist/50 px-4 py-2.5 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:bg-white focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none disabled:opacity-60"
          placeholder="Write a reply…"
          maxLength={DISCUSSION_REPLY_MAX_LENGTH}
          value={text}
          disabled={replyToDiscussion.isPending}
          onChange={(event) => {
            setText(event.target.value)
            fitInput(event.target)
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          aria-label="Send reply"
          className="grid size-11 flex-none place-items-center rounded-full bg-green-deep text-white shadow-[0_6px_16px_-8px_rgba(22,34,46,0.5)] transition-[background-color,transform,opacity] duration-150 ease-out hover:bg-green active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          disabled={replyToDiscussion.isPending || !body}
        >
          <SendHorizontal size={19} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {text.length >= COUNTER_SHOWN_FROM ? (
        <span className="justify-self-end pr-2 text-[0.8rem] text-ink-3" aria-hidden="true">
          {text.length}/{DISCUSSION_REPLY_MAX_LENGTH}
        </span>
      ) : null}
    </form>
  )
}
