import { useQuery } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox-api'
import { INBOX_POLL_INTERVAL_MS, inboxQueryKeys } from '../utils/query-keys'

/** How many messages the signed-in member hasn't read yet, across every conversation; polled for the sidebar badge */
export function useInboxUnreadCount(organizationId: string) {
  return useQuery({
    queryKey: inboxQueryKeys.unreadCount(organizationId),
    queryFn: () => inboxApi.getUnreadCount(organizationId),
    refetchInterval: INBOX_POLL_INTERVAL_MS,
  })
}
