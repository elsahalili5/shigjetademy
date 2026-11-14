import { apiClient } from '#/api/client'
import type {
  CreateDiscussionTopicInput,
  DiscussionReply,
  DiscussionReplyInput,
  DiscussionSpace,
  DiscussionTopicDetail,
  DiscussionTopicSummary,
  DiscussionUnreadCount,
  UpdateDiscussionTopicInput,
} from '@shigjetademy/shared/discussions'

type TopicParams = {
  organizationId: string
  topicId: string
}

type ReplyParams = TopicParams & {
  replyId: string
}

type CreateParams = CreateDiscussionTopicInput & {
  organizationId: string
}

type UpdateParams = UpdateDiscussionTopicInput & TopicParams

type SendReplyParams = DiscussionReplyInput & TopicParams

type UpdateReplyParams = DiscussionReplyInput & ReplyParams

type PinParams = TopicParams & {
  isPinned: boolean
}

type LockParams = TopicParams & {
  isLocked: boolean
}

const discussionsPath = (organizationId: string) => `/organizations/${organizationId}/discussions`

const topicPath = ({ organizationId, topicId }: TopicParams) => `${discussionsPath(organizationId)}/${topicId}`

const replyPath = ({ replyId, ...params }: ReplyParams) => `${topicPath(params)}/replies/${replyId}`

export const discussionsApi = {
  list: (organizationId: string) => apiClient.get<DiscussionTopicSummary[]>(discussionsPath(organizationId)),
  listSpaces: (organizationId: string) => apiClient.get<DiscussionSpace[]>(`${discussionsPath(organizationId)}/spaces`),
  getUnreadCount: (organizationId: string) => apiClient.get<DiscussionUnreadCount>(`${discussionsPath(organizationId)}/unread-count`),
  get: (params: TopicParams) => apiClient.get<DiscussionTopicDetail>(topicPath(params)),
  create: ({ organizationId, ...input }: CreateParams) => apiClient.post<DiscussionTopicDetail, CreateDiscussionTopicInput>(discussionsPath(organizationId), input),
  update: ({ organizationId, topicId, ...input }: UpdateParams) => apiClient.put<DiscussionTopicDetail, UpdateDiscussionTopicInput>(topicPath({ organizationId, topicId }), input),
  remove: (params: TopicParams) => apiClient.post<DiscussionTopicDetail>(`${topicPath(params)}/remove`),
  pin: ({ isPinned, ...params }: PinParams) => apiClient.put<DiscussionTopicDetail, { is_pinned: boolean }>(`${topicPath(params)}/pin`, { is_pinned: isPinned }),
  lock: ({ isLocked, ...params }: LockParams) => apiClient.put<DiscussionTopicDetail, { is_locked: boolean }>(`${topicPath(params)}/lock`, { is_locked: isLocked }),
  reply: ({ organizationId, topicId, ...input }: SendReplyParams) => apiClient.post<DiscussionReply, DiscussionReplyInput>(`${topicPath({ organizationId, topicId })}/replies`, input),
  updateReply: ({ organizationId, topicId, replyId, ...input }: UpdateReplyParams) =>
    apiClient.put<DiscussionReply, DiscussionReplyInput>(replyPath({ organizationId, topicId, replyId }), input),
  removeReply: (params: ReplyParams) => apiClient.post<DiscussionReply>(`${replyPath(params)}/remove`),
}
