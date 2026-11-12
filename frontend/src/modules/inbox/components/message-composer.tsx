import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { MESSAGE_MAX_LENGTH } from '@shigjetademy/shared/inbox'
import type { InboxContact, SendBlockedReason } from '@shigjetademy/shared/inbox'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useSendMessage } from '../hooks/use-send-message'
import { SEND_BLOCKED_HINTS } from '../utils/send-blocked-hints'

interface MessageComposerProps {
  organizationId: string
  conversationId: string
  other: InboxContact
  /** Why the member can't write here, or null when they can */
  blockedReason: SendBlockedReason | null
}

/** The message box under a thread; when the member can't write in it, a hint says why in its place */
export function MessageComposer({ organizationId, conversationId, other, blockedReason }: MessageComposerProps) {
  const [text, setText] = useState('')
  const sendMessage = useSendMessage({ organizationId, conversationId, other })
  const inputId = useId()
  const body = text.trim()

  if (blockedReason) {
    return (
      <p className="border-t border-rule bg-mist/60 px-5 py-4 text-[0.95rem] text-ink-2" role="note">
        {SEND_BLOCKED_HINTS[blockedReason]}
      </p>
    )
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body) return
    sendMessage.mutate({ body }, { onSuccess: () => setText('') })
  }

  return (
    <form className="grid gap-3 border-t border-rule px-5 py-4" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        Message
      </label>
      <textarea
        id={inputId}
        className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`}
        placeholder="Write a message…"
        maxLength={MESSAGE_MAX_LENGTH}
        value={text}
        disabled={sendMessage.isPending}
        onChange={(event) => setText(event.target.value)}
      />
      {sendMessage.isError ? <FormAlert>{getErrorMessage(sendMessage.error)}</FormAlert> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.87rem] text-ink-3" aria-hidden="true">
          {text.length}/{MESSAGE_MAX_LENGTH}
        </span>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={sendMessage.isPending || !body}>
          <SendHorizontal size={17} strokeWidth={2} aria-hidden="true" />
          {sendMessage.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}
