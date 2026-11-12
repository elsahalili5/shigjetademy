import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InboxContact } from '@shigjetademy/shared/inbox'
import { inboxApi } from '../api/inbox-api'
import { recordSentMessage } from '../utils/cache'

type StartConversationVariables = {
  recipient: InboxContact
  body: string
}

/** Starts a conversation, or adds to the one the pair already has, and adds the first message to the cached list */
export function useStartConversation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ recipient, body }: StartConversationVariables) => inboxApi.startConversation({ organizationId, recipient_membership_id: recipient.membership_id, body }),
    onSuccess: ({ conversation_id: conversationId, message }, { recipient }) =>
      recordSentMessage({ queryClient, organizationId, conversationId, message, other: recipient }),
  })
}
