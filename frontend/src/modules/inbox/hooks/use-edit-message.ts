import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EditMessageInput } from '@shigjetademy/shared/inbox'
import { inboxApi } from '../api/inbox-api'
import { recordChangedMessage, refreshAfterRefusedChange } from '../utils/cache'

type UseEditMessageParams = {
  organizationId: string
  conversationId: string
}

type EditMessageVariables = EditMessageInput & {
  messageId: string
}

/** Saves a change to the member's own message and shows it changed in the open conversation and the list; a refused change loads them again */
export function useEditMessage({ organizationId, conversationId }: UseEditMessageParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EditMessageVariables) => inboxApi.editMessage({ organizationId, conversationId, ...input }),
    onSuccess: (message) => recordChangedMessage({ queryClient, organizationId, conversationId, message }),
    onError: (error) => refreshAfterRefusedChange({ queryClient, organizationId, conversationId, error }),
  })
}
