import { z } from 'zod'

export {
  createDiscussionTopicSchema,
  discussionReplySchema,
  lockDiscussionTopicSchema,
  pinDiscussionTopicSchema,
  updateDiscussionTopicSchema,
} from '@shigjetademy/shared/discussions'

export const discussionParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  topicId: z.uuid('Invalid topic id'),
})

export const discussionReplyParamSchema = discussionParamSchema.extend({
  replyId: z.uuid('Invalid reply id'),
})
