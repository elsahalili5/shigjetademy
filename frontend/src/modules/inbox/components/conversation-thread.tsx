import { MessagesSquare } from 'lucide-react'
import type { InboxConversation } from '@shigjetademy/shared/inbox'
import { LoadError } from '#/components/LoadError'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useInboxConversation } from '../hooks/use-inbox-conversation'
import { MessageBubble } from './message-bubble'
import { MessageComposer } from './message-composer'

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
  const formatDateTime = useFormatDateTime()
  const { other, messages } = conversation
  // A message is seen once the other side opened the conversation at or after it was sent
  const seenUntil = conversation.other_last_read_at ? new Date(conversation.other_last_read_at).getTime() : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-rule px-5 py-3.5">
        <h2 className="text-[1.15rem] font-[650]">{fullName(other)}</h2>
        <p className="text-[0.93rem] text-ink-3">{ROLE_LABELS[other.role]}</p>
      </header>
      <ul className="flex min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-5" aria-label={`Messages with ${fullName(other)}`}>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMine={message.sender_membership_id === conversation.my_membership_id}
            isSeen={seenUntil !== null && new Date(message.created_at).getTime() <= seenUntil}
            isLatest={index === messages.length - 1}
            sentAt={formatDateTime(message.created_at)}
          />
        ))}
      </ul>
      <MessageComposer organizationId={organizationId} conversationId={conversation.id} other={other} blockedReason={conversation.send_blocked_reason} />
    </div>
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
