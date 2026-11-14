import type { QueryClient } from '@tanstack/react-query'
import type { DiscussionReply, DiscussionTopicDetail, DiscussionTopicSummary } from '@shigjetademy/shared/discussions'
import { discussionQueryKeys } from './query-keys'

const toSummary = (topic: DiscussionTopicDetail): DiscussionTopicSummary => ({
  id: topic.id,
  title: topic.title,
  space: topic.space,
  author: topic.author,
  is_pinned: topic.is_pinned,
  is_locked: topic.is_locked,
  status: topic.status,
  removed_by: topic.removed_by,
  reply_count: topic.reply_count,
  last_activity_at: topic.last_activity_at,
  created_at: topic.created_at,
  is_unread: topic.is_unread,
  is_space_archived: topic.is_space_archived,
})

/** Pinned first, then the latest activity: the order the server lists them in */
const sortTopics = (topics: DiscussionTopicSummary[]) =>
  [...topics].sort((first, second) => Number(second.is_pinned) - Number(first.is_pinned) || second.last_activity_at.localeCompare(first.last_activity_at))

type RecordTopicParams = {
  queryClient: QueryClient
  organizationId: string
  topic: DiscussionTopicDetail
}

/** Puts a topic the member just saved or moderated into the open detail and the list: in place when it is there, new ones in too, so nothing is fetched again */
export const recordTopic = ({ queryClient, organizationId, topic }: RecordTopicParams) => {
  queryClient.setQueryData<DiscussionTopicDetail>(discussionQueryKeys.detail({ organizationId, topicId: topic.id }), topic)
  queryClient.setQueryData<DiscussionTopicSummary[]>(discussionQueryKeys.list(organizationId), (topics = []) =>
    sortTopics(topics.some((item) => item.id === topic.id) ? topics.map((item) => (item.id === topic.id ? toSummary(topic) : item)) : [toSummary(topic), ...topics]),
  )
}

type ReplyChangeParams = {
  queryClient: QueryClient
  organizationId: string
  topicId: string
  reply: DiscussionReply
}

/** A reply the member just sent: added to the open topic, which moves up the list with one more reply */
export const recordSentReply = ({ queryClient, organizationId, topicId, reply }: ReplyChangeParams) => {
  queryClient.setQueryData<DiscussionTopicDetail>(discussionQueryKeys.detail({ organizationId, topicId }), (topic) =>
    topic && !topic.replies.some((item) => item.id === reply.id)
      ? { ...topic, replies: [...topic.replies, reply], reply_count: topic.reply_count + 1, last_activity_at: reply.created_at }
      : topic,
  )
  queryClient.setQueryData<DiscussionTopicSummary[]>(discussionQueryKeys.list(organizationId), (topics) =>
    topics && sortTopics(topics.map((item) => (item.id === topicId ? { ...item, reply_count: item.reply_count + 1, last_activity_at: reply.created_at } : item))),
  )
}

type ReplyChangedParams = ReplyChangeParams & {
  /** The reply was standing and no longer is */
  isRemoval: boolean
}

/** A reply the member just edited or removed, changed in the open topic; a removal takes one off the reply count */
export const recordChangedReply = ({ queryClient, organizationId, topicId, reply, isRemoval }: ReplyChangedParams) => {
  const step = isRemoval ? 1 : 0
  queryClient.setQueryData<DiscussionTopicDetail>(discussionQueryKeys.detail({ organizationId, topicId }), (topic) =>
    topic ? { ...topic, replies: topic.replies.map((item) => (item.id === reply.id ? reply : item)), reply_count: Math.max(0, topic.reply_count - step) } : topic,
  )
  queryClient.setQueryData<DiscussionTopicSummary[]>(discussionQueryKeys.list(organizationId), (topics) =>
    topics?.map((item) => (item.id === topicId ? { ...item, reply_count: Math.max(0, item.reply_count - step) } : item)),
  )
}
