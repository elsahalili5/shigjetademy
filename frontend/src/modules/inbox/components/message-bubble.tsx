import type { ReactNode } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import type { InboxMessage } from '@shigjetademy/shared/inbox'
import { initials } from '#/lib/initials'
import { REMOVED_MESSAGE_LABEL } from '../utils/removed-message-label'

export interface MessageBubbleProps {
  message: InboxMessage
  /** True for the signed-in member's own messages, shown on the right */
  isMine: boolean
  /** True once the other side has opened the conversation since this message was sent */
  isSeen: boolean
  /** The time of day the message was sent, like "09:15" */
  sentAt: string
  /** The last of a run, which gets the point of the bubble and the other person's avatar */
  isLastInRun: boolean
  /** The other person's name, for the avatar next to their messages */
  otherName: string
  /** The edit box, shown in place of the words in a wide white bubble while the message is being changed */
  editor?: ReactNode
  /** The three-dots menu beside the bubble, shown on hover */
  menu?: ReactNode
  /** Notes under the bubble, like a remove confirmation or an error */
  actions?: ReactNode
}

/** One chat bubble, inside the thread's list item: the member's own in green on the right, the other person's in white on the left with their avatar */
export function MessageBubble({ message, isMine, isSeen, sentAt, isLastInRun, otherName, editor, menu, actions }: MessageBubbleProps) {
  const isEditing = !!editor
  const isRemoved = message.status === 'REMOVED'
  const bubbleShape = isMine ? `rounded-2xl ${isLastInRun ? 'rounded-br-sm' : ''}` : `rounded-2xl ${isLastInRun ? 'rounded-bl-sm' : ''}`
  const isGreen = isMine && !isEditing
  const bubbleColors = isGreen ? 'bg-green-deep text-white' : 'border border-rule bg-white text-ink'

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {isMine ? null : (
        <span className="grid size-8 flex-none place-items-center" aria-hidden="true">
          {isLastInRun ? <span className="grid size-8 place-items-center rounded-full bg-green-wash text-[0.78rem] font-bold text-green-deep">{initials(otherName)}</span> : null}
        </span>
      )}
      <div className={`grid min-w-0 gap-1 ${isEditing ? 'w-full max-w-[34rem]' : 'max-w-[min(34rem,80%)]'} ${isMine ? 'justify-items-end' : 'justify-items-start'}`}>
        <div className={`flex min-w-0 items-center gap-1 ${isEditing ? 'w-full' : ''} ${isMine ? 'flex-row-reverse' : ''}`}>
          <div className={`grid min-w-0 gap-0.5 px-3.5 pt-2 pb-1.5 shadow-[0_1px_1px_rgba(22,34,46,0.05)] ${isEditing ? 'w-full' : ''} ${bubbleShape} ${bubbleColors}`}>
            <MessageText message={message} editor={editor} isGreen={isGreen} />
            <span className={`flex items-center justify-end gap-1.5 text-[0.75rem] ${isGreen ? 'text-white/75' : 'text-ink-3'}`}>
              {message.edited_at && !isRemoved ? <span>(edited)</span> : null}
              <time dateTime={message.created_at}>{sentAt}</time>
              {isMine ? <DeliveryTicks isSeen={isSeen} isGreen={isGreen} /> : null}
            </span>
          </div>
          {menu}
        </div>
        {actions}
      </div>
    </div>
  )
}

interface MessageTextProps {
  message: InboxMessage
  editor?: ReactNode
  /** True on the member's own green bubble, for the removed note's colour */
  isGreen: boolean
}

/** A message's words, the edit box while it is being changed, or that it was removed */
function MessageText({ message, editor, isGreen }: MessageTextProps) {
  if (message.status === 'REMOVED') return <p className={`italic ${isGreen ? 'text-white/80' : 'text-ink-3'}`}>{REMOVED_MESSAGE_LABEL}</p>
  if (editor) return editor
  return <p className="break-words whitespace-pre-wrap">{message.body}</p>
}

interface DeliveryTicksProps {
  /** True once the other side has opened the conversation since the message was sent */
  isSeen: boolean
  /** True on the green bubble; a bubble being edited is white */
  isGreen: boolean
}

/** The tick inside the member's own bubble: one pale tick once sent, two bright ones once the other person has seen it */
function DeliveryTicks({ isSeen, isGreen }: DeliveryTicksProps) {
  if (isSeen) return <CheckCheck className="text-sky-300" size={15} strokeWidth={2.4} role="img" aria-label="Seen" />
  return <Check className={isGreen ? 'text-white/60' : 'text-ink-3'} size={15} strokeWidth={2.4} role="img" aria-label="Sent" />
}
