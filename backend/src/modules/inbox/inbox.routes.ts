import { Router } from 'express'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { InboxController } from './inbox.controller.ts'
import { conversationParamSchema, sendMessageSchema, startConversationSchema } from './inbox.schema.ts'

// Mounted at /api/organizations. Every member of the organization has an inbox; who they can message and which conversations they read
// is decided by the service: canMessage for sending, and only the two participants read a conversation.
const router = Router()

const INBOX = '/:organizationId/inbox'
const CONVERSATIONS = `${INBOX}/conversations`
const CONVERSATION = `${CONVERSATIONS}/:conversationId`

const isMember = requireMembership([...MEMBER_ROLES])
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const conversationParam = validateRequestMiddleware(conversationParamSchema, 'params')

router.get(`${INBOX}/contacts`, authMiddleware, organizationParam, isMember, InboxController.listContacts)

router.get(`${INBOX}/unread-count`, authMiddleware, organizationParam, isMember, InboxController.getUnreadCount)

router.get(CONVERSATIONS, authMiddleware, organizationParam, isMember, InboxController.listConversations)

router.post(CONVERSATIONS, authMiddleware, organizationParam, isMember, validateRequestMiddleware(startConversationSchema), InboxController.startConversation)

router.get(CONVERSATION, authMiddleware, conversationParam, isMember, InboxController.getConversation)

router.post(`${CONVERSATION}/messages`, authMiddleware, conversationParam, isMember, validateRequestMiddleware(sendMessageSchema), InboxController.sendMessage)

export default router
