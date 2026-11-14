import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { DiscussionTopicSummary } from '@shigjetademy/shared/discussions'
import { discussionsApi } from '../api/discussions-api'
import { DISCUSSION_POLL_INTERVAL_MS, discussionQueryKeys } from '../utils/query-keys'

type UseDiscussionParams = {
  organizationId: string
  topicId: string
}

/**
 * One topic with its replies, polled while it is open so new replies show. Opening it marks it read on the server, so the list's unread dot for it
 * goes out here and the total is read again.
 */
export function useDiscussion({ organizationId, topicId }: UseDiscussionParams) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: discussionQueryKeys.detail({ organizationId, topicId }),
    queryFn: async () => {
      const topic = await discussionsApi.get({ organizationId, topicId })
      queryClient.setQueryData<DiscussionTopicSummary[]>(discussionQueryKeys.list(organizationId), (topics) => topics?.map((item) => (item.id === topicId ? { ...item, is_unread: false } : item)))
      await queryClient.invalidateQueries({ queryKey: discussionQueryKeys.unreadCount(organizationId) })
      return topic
    },
    refetchInterval: DISCUSSION_POLL_INTERVAL_MS,
  })
}
