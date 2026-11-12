import type { QueryClient } from '@tanstack/react-query'
import type { InboxContact, InboxConversation, InboxConversationSummary, InboxMessage } from '@shigjetademy/shared/inbox'
import { inboxQueryKeys } from './query-keys'

type RecordSentMessageParams = {
  queryClient: QueryClient
  organizationId: string
  conversationId: string
  message: InboxMessage
  /** Who the message went to, for a conversation the list doesn't hold yet */
  other: InboxContact
}

/** Puts a message the member just sent into the open conversation and the list, moving its conversation to the top, so nothing is fetched again */
export const recordSentMessage = ({ queryClient, organizationId, conversationId, message, other }: RecordSentMessageParams) => {
  queryClient.setQueryData<InboxConversation>(inboxQueryKeys.conversation({ organizationId, conversationId }), (conversation) =>
    conversation && !conversation.messages.some((item) => item.id === message.id) ? { ...conversation, messages: [...conversation.messages, message] } : conversation,
  )
  queryClient.setQueryData<InboxConversationSummary[]>(inboxQueryKeys.conversations(organizationId), (conversations = []) => {
    const existing = conversations.find((item) => item.id === conversationId)
    const updated: InboxConversationSummary = { id: conversationId, other, unread_count: 0, ...existing, last_message: message, last_message_at: message.created_at }
    return [updated, ...conversations.filter((item) => item.id !== conversationId)]
  })
}
