import type { z } from 'zod'
import type { discussionParamSchema, discussionReplyParamSchema } from './discussions.schema.ts'

export type {
  CreateDiscussionTopicInput,
  DiscussionReplyInput,
  LockDiscussionTopicInput,
  PinDiscussionTopicInput,
  UpdateDiscussionTopicInput,
} from '@shigjetademy/shared/discussions'

export type DiscussionParam = z.infer<typeof discussionParamSchema>

export type DiscussionReplyParam = z.infer<typeof discussionReplyParamSchema>
