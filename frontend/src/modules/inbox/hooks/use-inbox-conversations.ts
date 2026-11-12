import { useQuery } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox-api'
import { INBOX_POLL_INTERVAL_MS, inboxQueryKeys } from '../utils/query-keys'

/** The signed-in member's conversations, newest message first, polled for new ones */
export function useInboxConversations(organizationId: string) {
  return useQuery({
    queryKey: inboxQueryKeys.conversations(organizationId),
    queryFn: () => inboxApi.listConversations(organizationId),
    refetchInterval: INBOX_POLL_INTERVAL_MS,
  })
}
