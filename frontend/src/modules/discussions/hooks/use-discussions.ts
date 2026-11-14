import { useQuery } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { DISCUSSION_POLL_INTERVAL_MS, discussionQueryKeys } from '../utils/query-keys'

/** The topics in the signed-in member's groups and courses, pinned first and then the latest activity, polled for new ones */
export function useDiscussions(organizationId: string) {
  return useQuery({
    queryKey: discussionQueryKeys.list(organizationId),
    queryFn: () => discussionsApi.list(organizationId),
    refetchInterval: DISCUSSION_POLL_INTERVAL_MS,
  })
}
