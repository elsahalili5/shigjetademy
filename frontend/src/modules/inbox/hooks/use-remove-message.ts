import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox-api'
import { recordChangedMessage, refreshAfterRefusedChange } from '../utils/cache'

type UseRemoveMessageParams = {
  organizationId: string
  conversationId: string
}

/** Removes the member's own message (it stays in place, shown as removed) and shows it so in the open conversation and the list; a refused change loads them again */
export function useRemoveMessage({ organizationId, conversationId }: UseRemoveMessageParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => inboxApi.removeMessage({ organizationId, conversationId, messageId }),
    onSuccess: (message) => recordChangedMessage({ queryClient, organizationId, conversationId, message }),
    onError: (error) => refreshAfterRefusedChange({ queryClient, organizationId, conversationId, error }),
  })
}
