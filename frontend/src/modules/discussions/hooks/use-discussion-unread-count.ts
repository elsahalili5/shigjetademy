import { useQuery } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { DISCUSSION_POLL_INTERVAL_MS, discussionQueryKeys } from '../utils/query-keys'

type UseDiscussionUnreadCountParams = {
  organizationId: string
  /** Guardians take no part in discussions, so their sidebar doesn't ask */
  isEnabled: boolean
}

/** How many topics the signed-in member hasn't read since someone else posted; polled for the sidebar badge */
export function useDiscussionUnreadCount({ organizationId, isEnabled }: UseDiscussionUnreadCountParams) {
  return useQuery({
    queryKey: discussionQueryKeys.unreadCount(organizationId),
    queryFn: () => discussionsApi.getUnreadCount(organizationId),
    refetchInterval: DISCUSSION_POLL_INTERVAL_MS,
    enabled: isEnabled,
  })
}
