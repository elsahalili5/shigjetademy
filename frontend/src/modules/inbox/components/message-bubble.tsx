import { Check } from 'lucide-react'
import type { InboxMessage } from '@shigjetademy/shared/inbox'

interface MessageBubbleProps {
  message: InboxMessage
  /** True for the signed-in member's own messages, shown on the right */
  isMine: boolean
  /** True once the other side has opened the conversation since this message was sent */
  isSeen: boolean
  /** The message's date and time, written the way the organization writes them */
  sentAt: string
  /** The newest message, which scrolls into view when it appears */
  isLatest: boolean
}

/** Scrolls the newest message into view when it appears; a stable function, so older messages are left where the reader has scrolled to */
const scrollIntoViewOnMount = (node: HTMLElement | null) => node?.scrollIntoView({ block: 'nearest' })

export function MessageBubble({ message, isMine, isSeen, sentAt, isLatest }: MessageBubbleProps) {
  return (
    <li ref={isLatest ? scrollIntoViewOnMount : undefined} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
      <p
        className={`max-w-[min(34rem,85%)] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap ${isMine ? 'rounded-br-md bg-green-wash text-ink' : 'rounded-bl-md border border-rule bg-white text-ink'}`}
      >
        {message.body}
      </p>
      <span className="flex items-center gap-1.5 px-1 text-[0.82rem] text-ink-3">
        <time dateTime={message.created_at}>{sentAt}</time>
        {isMine && isSeen ? (
          <span className="inline-flex items-center gap-0.5 font-semibold text-green-deep">
            <Check size={13} strokeWidth={2.4} aria-hidden="true" />
            Seen
          </span>
        ) : null}
      </span>
    </li>
  )
}
