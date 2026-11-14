import { useState } from 'react'
import { ChatBubbleMenu } from '#/components/ChatBubbleMenu'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useRemoveMessage } from '../hooks/use-remove-message'
import { EditMessageForm } from './edit-message-form'
import { MessageBubble } from './message-bubble'
import type { MessageBubbleProps } from './message-bubble'

interface OwnMessageProps extends Omit<MessageBubbleProps, 'isMine' | 'editor' | 'menu' | 'actions'> {
  organizationId: string
  conversationId: string
}

/** The member's own active message while they may still send: its bubble with the menu to edit it in place or remove it after one confirmation */
export function OwnMessage({ organizationId, conversationId, ...bubble }: OwnMessageProps) {
  const removeMessage = useRemoveMessage({ organizationId, conversationId })
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  const handleRemove = () => removeMessage.mutate(bubble.message.id, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <MessageBubble
      {...bubble}
      isMine
      editor={isEditing ? <EditMessageForm organizationId={organizationId} conversationId={conversationId} message={bubble.message} onDone={() => setIsEditing(false)} /> : undefined}
      menu={
        isEditing ? null : (
          <ChatBubbleMenu label="Message actions" editLabel="Edit message" removeLabel="Remove message" canEdit canRemove isMine onEdit={() => setIsEditing(true)} onRemove={() => setIsConfirmingRemove(true)} />
        )
      }
      actions={
        <>
          {removeMessage.isError ? <FormAlert>{getErrorMessage(removeMessage.error)}</FormAlert> : null}
          {isConfirmingRemove ? <ConfirmGroup label="Remove this message" question="Remove this message?" confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} /> : null}
        </>
      }
    />
  )
}
