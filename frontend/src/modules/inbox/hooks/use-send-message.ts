import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InboxContact } from '@shigjetademy/shared/inbox'
import { inboxApi } from '../api/inbox-api'
import { recordSentMessage } from '../utils/cache'

type UseSendMessageParams = {
  organizationId: string
  conversationId: string
  other: InboxContact
}

/** Sends a message into an open conversation and adds it to the cached thread and list */
export function useSendMessage({ organizationId, conversationId, other }: UseSendMessageParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { body: string }) => inboxApi.sendMessage({ organizationId, conversationId, ...input }),
    onSuccess: (message) => recordSentMessage({ queryClient, organizationId, conversationId, message, other }),
  })
}
