import type { QueryClient } from '@tanstack/react-query'
import { isApiError } from '#/api/client'
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

type RecordChangedMessageParams = {
  queryClient: QueryClient
  organizationId: string
  conversationId: string
  /** The message as the server returned it after an edit or a removal */
  message: InboxMessage
}

/** Swaps an edited or removed message into the open conversation and, when it is the last one, the list's preview; nothing moves, as a change is no new activity */
export const recordChangedMessage = ({ queryClient, organizationId, conversationId, message }: RecordChangedMessageParams) => {
  queryClient.setQueryData<InboxConversation>(inboxQueryKeys.conversation({ organizationId, conversationId }), (conversation) =>
    conversation ? { ...conversation, messages: conversation.messages.map((item) => (item.id === message.id ? message : item)) } : conversation,
  )
  queryClient.setQueryData<InboxConversationSummary[]>(inboxQueryKeys.conversations(organizationId), (conversations) =>
    conversations?.map((item) => (item.last_message?.id === message.id ? { ...item, last_message: message } : item)),
  )
}

const REFUSED_CHANGE_STATUSES: ReadonlySet<number> = new Set([403, 409])

type RefreshAfterRefusedChangeParams = {
  queryClient: QueryClient
  organizationId: string
  conversationId: string
  error: unknown
}

/** A refused edit or removal means the cached conversation is out of date (the member can no longer send, or the message is gone), so it and the list are loaded again */
export const refreshAfterRefusedChange = ({ queryClient, organizationId, conversationId, error }: RefreshAfterRefusedChangeParams) => {
  const status = isApiError(error) ? error.response?.status : undefined
  if (status === undefined || !REFUSED_CHANGE_STATUSES.has(status)) return
  void queryClient.invalidateQueries({ queryKey: inboxQueryKeys.conversation({ organizationId, conversationId }) })
  void queryClient.invalidateQueries({ queryKey: inboxQueryKeys.conversations(organizationId), exact: true })
}
