import { Check, CheckCheck } from 'lucide-react'
import type { InboxMessage } from '@shigjetademy/shared/inbox'
import { initials } from '#/lib/initials'

interface MessageBubbleProps {
  message: InboxMessage
  /** True for the signed-in member's own messages, shown on the right */
  isMine: boolean
  /** True once the other side has opened the conversation since this message was sent */
  isSeen: boolean
  /** The time of day the message was sent, like "09:15" */
  sentAt: string
  /** The newest message, which scrolls into view when it appears */
  isLatest: boolean
  /** The first of a run of messages from one person, which gets more space above it */
  isFirstInRun: boolean
  /** The last of a run, which gets the point of the bubble and the other person's avatar */
  isLastInRun: boolean
  /** The other person's name, for the avatar next to their messages */
  otherName: string
}

/** Scrolls the newest message into view when it appears; a stable function, so older messages are left where the reader has scrolled to */
const scrollIntoViewOnMount = (node: HTMLElement | null) => node?.scrollIntoView({ block: 'nearest' })

/** One chat bubble: the member's own in green on the right, the other person's in white on the left with their avatar */
export function MessageBubble({ message, isMine, isSeen, sentAt, isLatest, isFirstInRun, isLastInRun, otherName }: MessageBubbleProps) {
  const bubbleShape = isMine ? `rounded-2xl ${isLastInRun ? 'rounded-br-sm' : ''}` : `rounded-2xl ${isLastInRun ? 'rounded-bl-sm' : ''}`
  const bubbleColors = isMine ? 'bg-green-deep text-white' : 'border border-rule bg-white text-ink'

  return (
    <li ref={isLatest ? scrollIntoViewOnMount : undefined} className={`grid gap-0.5 ${isFirstInRun ? 'mt-3 first:mt-0' : 'mt-0.5'}`}>
      <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {isMine ? null : (
          <span className="grid size-8 flex-none place-items-center" aria-hidden="true">
            {isLastInRun ? <span className="grid size-8 place-items-center rounded-full bg-green-wash text-[0.78rem] font-bold text-green-deep">{initials(otherName)}</span> : null}
          </span>
        )}
        <div className={`grid max-w-[min(34rem,80%)] gap-0.5 px-3.5 pt-2 pb-1.5 shadow-[0_1px_1px_rgba(22,34,46,0.05)] ${bubbleShape} ${bubbleColors}`}>
          <p className="break-words whitespace-pre-wrap">{message.body}</p>
          <span className={`flex items-center justify-end gap-1 text-[0.75rem] ${isMine ? 'text-white/75' : 'text-ink-3'}`}>
            <time dateTime={message.created_at}>{sentAt}</time>
            {isMine ? <DeliveryTicks isSeen={isSeen} /> : null}
          </span>
        </div>
      </div>
    </li>
  )
}

interface DeliveryTicksProps {
  /** True once the other side has opened the conversation since the message was sent */
  isSeen: boolean
}

/** The tick inside the member's own bubble: one pale tick once sent, two bright ones once the other person has seen it */
function DeliveryTicks({ isSeen }: DeliveryTicksProps) {
  if (isSeen) return <CheckCheck className="text-sky-300" size={15} strokeWidth={2.4} role="img" aria-label="Seen" />
  return <Check className="text-white/60" size={15} strokeWidth={2.4} role="img" aria-label="Sent" />
}
