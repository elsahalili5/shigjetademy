import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { InboxConversationSummary } from '@shigjetademy/shared/inbox'
import { inboxApi } from '../api/inbox-api'
import { INBOX_POLL_INTERVAL_MS, inboxQueryKeys } from '../utils/query-keys'

type UseInboxConversationParams = {
  organizationId: string
  conversationId: string
}

/**
 * One conversation with its messages, polled while it is open. Reading it marks it read on the server, so the list's unread count for it
 * drops to zero here and the total is read again.
 */
export function useInboxConversation({ organizationId, conversationId }: UseInboxConversationParams) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: inboxQueryKeys.conversation({ organizationId, conversationId }),
    queryFn: async () => {
      const conversation = await inboxApi.getConversation({ organizationId, conversationId })
      queryClient.setQueryData<InboxConversationSummary[]>(inboxQueryKeys.conversations(organizationId), (conversations) =>
        conversations?.map((item) => (item.id === conversationId ? { ...item, unread_count: 0 } : item)),
      )
      await queryClient.invalidateQueries({ queryKey: inboxQueryKeys.unreadCount(organizationId) })
      return conversation
    },
    refetchInterval: INBOX_POLL_INTERVAL_MS,
  })
}
