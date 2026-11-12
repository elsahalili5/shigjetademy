import { apiClient } from '#/api/client'
import type { InboxContact, InboxConversation, InboxConversationSummary, InboxMessage, InboxUnreadCount, SendMessageInput, StartConversationInput, StartedConversation } from '@shigjetademy/shared/inbox'

type ConversationParams = {
  organizationId: string
  conversationId: string
}

type StartConversationParams = StartConversationInput & {
  organizationId: string
}

type SendMessageParams = SendMessageInput & ConversationParams

export const inboxApi = {
  listContacts: (organizationId: string) => apiClient.get<InboxContact[]>(`/organizations/${organizationId}/inbox/contacts`),
  listConversations: (organizationId: string) => apiClient.get<InboxConversationSummary[]>(`/organizations/${organizationId}/inbox/conversations`),
  getConversation: ({ organizationId, conversationId }: ConversationParams) =>
    apiClient.get<InboxConversation>(`/organizations/${organizationId}/inbox/conversations/${conversationId}`),
  startConversation: ({ organizationId, ...input }: StartConversationParams) =>
    apiClient.post<StartedConversation, StartConversationInput>(`/organizations/${organizationId}/inbox/conversations`, input),
  sendMessage: ({ organizationId, conversationId, ...input }: SendMessageParams) =>
    apiClient.post<InboxMessage, SendMessageInput>(`/organizations/${organizationId}/inbox/conversations/${conversationId}/messages`, input),
  getUnreadCount: (organizationId: string) => apiClient.get<InboxUnreadCount>(`/organizations/${organizationId}/inbox/unread-count`),
}
