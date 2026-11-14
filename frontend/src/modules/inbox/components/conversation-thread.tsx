import { Fragment, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import type { InboxConversation } from '@shigjetademy/shared/inbox'
import { LoadError } from '#/components/LoadError'
import { fullName } from '#/lib/full-name'
import { initials } from '#/lib/initials'
import { useFormatDate, useFormatTime } from '#/lib/use-format-date'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useInboxConversation } from '../hooks/use-inbox-conversation'
import { MessageBubble } from './message-bubble'
import { MessageComposer } from './message-composer'
import { getDayLabel, getMessageDayKey } from '#/lib/message-days'

interface ConversationThreadProps {
  organizationId: string
  conversationId: string
}

/** One open conversation: who it is with, the messages oldest first, and the message box */
export function ConversationThread({ organizationId, conversationId }: ConversationThreadProps) {
  const conversation = useInboxConversation({ organizationId, conversationId })

  if (conversation.status === 'error') return <LoadError what="conversation" onRetry={() => void conversation.refetch()} />
  if (!conversation.data) return <ThreadSkeleton />
  return <LoadedThread organizationId={organizationId} conversation={conversation.data} />
}

interface LoadedThreadProps {
  organizationId: string
  conversation: InboxConversation
}

function LoadedThread({ organizationId, conversation }: LoadedThreadProps) {
  const formatDate = useFormatDate()
  const formatTime = useFormatTime()
  // Read once, so the "Today" headings don't change while the thread is open
  const [now] = useState(() => new Date())
  const { other, messages } = conversation
  const otherName = fullName(other)
  // A message is seen once the other side opened the conversation at or after it was sent
  const seenUntil = conversation.other_last_read_at ? new Date(conversation.other_last_read_at).getTime() : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-rule px-5 py-3.5">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
          {initials(otherName)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[1.15rem] font-[650]">{otherName}</h2>
          <p className="text-[0.93rem] text-ink-3">{ROLE_LABELS[other.role]}</p>
        </div>
      </header>
      <ul className="flex max-h-[min(62svh,640px)] min-h-[300px] flex-1 flex-col overflow-y-auto bg-mist/40 px-5 py-5" aria-label={`Messages with ${otherName}`}>
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const next = messages[index + 1]
          const dayKey = getMessageDayKey(message.created_at)
          const isNewDay = !previous || getMessageDayKey(previous.created_at) !== dayKey
          const isFirstInRun = isNewDay || previous?.sender_membership_id !== message.sender_membership_id
          const isLastInRun = !next || getMessageDayKey(next.created_at) !== dayKey || next.sender_membership_id !== message.sender_membership_id
          return (
            <Fragment key={message.id}>
              {isNewDay ? <DayHeading label={getDayLabel({ iso: message.created_at, now, formatDate })} /> : null}
              <MessageBubble
                message={message}
                isMine={message.sender_membership_id === conversation.my_membership_id}
                isSeen={seenUntil !== null && new Date(message.created_at).getTime() <= seenUntil}
                isLatest={index === messages.length - 1}
                isFirstInRun={isFirstInRun}
                isLastInRun={isLastInRun}
                otherName={otherName}
                sentAt={formatTime(message.created_at)}
              />
            </Fragment>
          )
        })}
      </ul>
      <MessageComposer organizationId={organizationId} conversationId={conversation.id} other={other} blockedReason={conversation.send_blocked_reason} />
    </div>
  )
}

interface DayHeadingProps {
  label: string
}

/** The pill between days of a chat: Today, Yesterday or a date */
function DayHeading({ label }: DayHeadingProps) {
  return (
    <li role="separator" aria-label={label} className="my-3 flex justify-center first:mt-0">
      <span className="rounded-full bg-white px-3 py-1 text-[0.8rem] font-semibold text-ink-3 shadow-[0_1px_1px_rgba(22,34,46,0.06)] ring-1 ring-rule">{label}</span>
    </li>
  )
}

function ThreadSkeleton() {
  return (
    <div className="grid flex-1 content-start gap-4 px-5 py-5" aria-busy="true" aria-label="Loading">
      <span className="h-5 w-40 animate-pulse rounded bg-mist" aria-hidden="true" />
      <span className="h-12 w-3/5 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />
      <span className="h-12 w-2/5 animate-pulse justify-self-end rounded-2xl bg-mist" aria-hidden="true" />
      <span className="h-12 w-1/2 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />
    </div>
  )
}

/** What the thread side shows before a conversation is picked */
export function NoConversationSelected() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-2 px-5 py-16 text-center text-ink-2">
      <MessagesSquare className="text-ink-3" size={26} strokeWidth={1.6} aria-hidden="true" />
      <p className="font-semibold text-ink">Pick a conversation</p>
      <p>Choose one on the left, or start a new message.</p>
    </div>
  )
}
