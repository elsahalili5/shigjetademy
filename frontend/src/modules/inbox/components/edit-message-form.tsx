import { useId, useState } from 'react'
import type { KeyboardEvent, SubmitEvent } from 'react'
import { MESSAGE_MAX_LENGTH } from '@shigjetademy/shared/inbox'
import type { InboxMessage } from '@shigjetademy/shared/inbox'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useEditMessage } from '../hooks/use-edit-message'

interface EditMessageFormProps {
  organizationId: string
  conversationId: string
  message: InboxMessage
  /** Closes the box, after a save or a cancel */
  onDone: () => void
}

/** The edit box inside the member's own bubble: Enter or Save message saves, Shift+Enter starts a new line, Escape or Cancel leaves it unchanged */
export function EditMessageForm({ organizationId, conversationId, message, onDone }: EditMessageFormProps) {
  const [text, setText] = useState(message.body)
  const editMessage = useEditMessage({ organizationId, conversationId })
  const inputId = useId()
  const body = text.trim()

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body || editMessage.isPending) return
    if (body === message.body) return onDone()
    editMessage.mutate({ messageId: message.id, body }, { onSuccess: onDone })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onDone()
      return
    }
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className="grid gap-2 text-ink" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        Edit message
      </label>
      <textarea
        id={inputId}
        className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`}
        maxLength={MESSAGE_MAX_LENGTH}
        value={text}
        disabled={editMessage.isPending}
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {editMessage.isError ? <FormAlert>{getErrorMessage(editMessage.error)}</FormAlert> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-9 px-3.5 text-[0.95rem]" disabled={editMessage.isPending || !body}>
          {editMessage.isPending ? 'Saving…' : 'Save message'}
        </button>
      </div>
    </form>
  )
}
