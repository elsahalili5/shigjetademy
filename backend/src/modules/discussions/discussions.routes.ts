import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { DiscussionController } from './discussions.controller.ts'
import {
  createDiscussionTopicSchema,
  discussionParamSchema,
  discussionReplyParamSchema,
  discussionReplySchema,
  lockDiscussionTopicSchema,
  pinDiscussionTopicSchema,
  updateDiscussionTopicSchema,
} from './discussions.schema.ts'

// Mounted at /api/organizations. Every member but a guardian takes part; which spaces a person sees, and who moderates them, is decided by the service.
const router = Router()

const DISCUSSIONS = '/:organizationId/discussions'
const DISCUSSION = `${DISCUSSIONS}/:topicId`
const REPLIES = `${DISCUSSION}/replies`
const REPLY = `${REPLIES}/:replyId`

const takesPart = requireMembership(['OWNER', 'ADMIN', 'LECTURER', 'STUDENT'])
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const topicParam = validateRequestMiddleware(discussionParamSchema, 'params')
const replyParam = validateRequestMiddleware(discussionReplyParamSchema, 'params')

router.get(DISCUSSIONS, authMiddleware, organizationParam, takesPart, DiscussionController.list)

router.get(`${DISCUSSIONS}/unread-count`, authMiddleware, organizationParam, takesPart, DiscussionController.getUnreadCount)

router.get(`${DISCUSSIONS}/spaces`, authMiddleware, organizationParam, takesPart, DiscussionController.listSpaces)

router.post(DISCUSSIONS, authMiddleware, organizationParam, takesPart, validateRequestMiddleware(createDiscussionTopicSchema), DiscussionController.create)

router.get(DISCUSSION, authMiddleware, topicParam, takesPart, DiscussionController.get)

router.put(DISCUSSION, authMiddleware, topicParam, takesPart, validateRequestMiddleware(updateDiscussionTopicSchema), DiscussionController.update)

router.post(`${DISCUSSION}/remove`, authMiddleware, topicParam, takesPart, DiscussionController.remove)

router.put(`${DISCUSSION}/pin`, authMiddleware, topicParam, takesPart, validateRequestMiddleware(pinDiscussionTopicSchema), DiscussionController.pin)

router.put(`${DISCUSSION}/lock`, authMiddleware, topicParam, takesPart, validateRequestMiddleware(lockDiscussionTopicSchema), DiscussionController.lock)

router.post(REPLIES, authMiddleware, topicParam, takesPart, validateRequestMiddleware(discussionReplySchema), DiscussionController.reply)

router.put(REPLY, authMiddleware, replyParam, takesPart, validateRequestMiddleware(discussionReplySchema), DiscussionController.updateReply)

router.post(`${REPLY}/remove`, authMiddleware, replyParam, takesPart, DiscussionController.removeReply)

export default router
