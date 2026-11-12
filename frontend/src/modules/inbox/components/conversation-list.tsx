import { Inbox } from 'lucide-react'
import type { InboxConversationSummary } from '@shigjetademy/shared/inbox'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'

interface ConversationListProps {
  status: 'pending' | 'error' | 'success'
  conversations?: InboxConversationSummary[]
  selectedId: string | null
  onSelect: (conversationId: string) => void
  onRetry: () => void
}

/** The member's conversations, newest first; the unread ones carry a dot and their count */
export function ConversationList({ status, conversations, selectedId, onSelect, onRetry }: ConversationListProps) {
  const formatDateTime = useFormatDateTime()

  if (status === 'error') return <LoadError what="conversations" onRetry={onRetry} />
  if (!conversations) return <SkeletonRows />
  if (conversations.length === 0) return <EmptyMessage icon={Inbox} title="No messages yet." text="Start a conversation with New message." />
  return (
    <ul aria-label="Conversations">
      {conversations.map((conversation) => {
        const { other, last_message: lastMessage } = conversation
        const isSelected = conversation.id === selectedId
        const hasUnread = conversation.unread_count > 0
        const preview = lastMessage ? `${lastMessage.sender_membership_id === other.membership_id ? '' : 'You: '}${lastMessage.body}` : ''
        return (
          <li key={conversation.id} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              className={`grid w-full gap-1 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-mist ${isSelected ? 'bg-green-wash' : ''}`}
              onClick={() => onSelect(conversation.id)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`flex min-w-0 items-center gap-2 ${hasUnread ? 'font-bold' : 'font-semibold'}`}>
                  {hasUnread ? <span className="size-2 flex-none rounded-full bg-green-deep" aria-hidden="true" /> : null}
                  <span className="truncate">{fullName(other)}</span>
                </span>
                {hasUnread ? (
                  <span className="min-w-6 flex-none rounded-full bg-green-deep px-2 py-0.5 text-center text-[0.8rem] font-bold text-white" aria-label={`${conversation.unread_count} unread`}>
                    {conversation.unread_count}
                  </span>
                ) : null}
              </span>
              <span className="text-[0.82rem] text-ink-3">
                {ROLE_LABELS[other.role]} · <time dateTime={conversation.last_message_at}>{formatDateTime(conversation.last_message_at)}</time>
              </span>
              <span className={`truncate text-[0.95rem] ${hasUnread ? 'text-ink' : 'text-ink-2'}`}>{preview}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
