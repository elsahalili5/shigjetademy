import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { InboxService } from './inbox.service.ts'
import type { ConversationParam, SendMessageInput, StartConversationInput } from './inbox.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type ConversationRequest = AuthRequest & TypedRequest<unknown, ConversationParam>

type SendMessageRequest = AuthRequest & TypedRequest<SendMessageInput, ConversationParam>

type StartConversationRequest = AuthRequest & TypedRequest<StartConversationInput, OrganizationIdParam>

/** The caller's seat in the organization of the path; the route already checked they are a member */
const findMembershipId = (req: AuthRequest) => req.user?.memberships.find((membership) => membership.organization.id === req.params.organizationId)?.id

export const InboxController = {
  listContacts: async (req: OrganizationRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const contacts = await InboxService.listContacts({ organizationId: req.params.organizationId, membershipId })
      return res.status(200).json({ data: contacts })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your contacts' })
    }
  },

  listConversations: async (req: OrganizationRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const conversations = await InboxService.listConversations({ organizationId: req.params.organizationId, membershipId })
      return res.status(200).json({ data: conversations })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your conversations' })
    }
  },

  getConversation: async (req: ConversationRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const conversation = await InboxService.getConversation({ ...req.params, membershipId })
      return res.status(200).json({ data: conversation })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the conversation' })
    }
  },

  startConversation: async (req: StartConversationRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const started = await InboxService.startConversation({ organizationId: req.params.organizationId, membershipId, data: req.body })
      return res.status(201).json({ data: started })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the message' })
    }
  },

  sendMessage: async (req: SendMessageRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const message = await InboxService.sendMessage({ ...req.params, membershipId, data: req.body })
      return res.status(201).json({ data: message })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the message' })
    }
  },

  getUnreadCount: async (req: OrganizationRequest, res: Response) => {
    try {
      const membershipId = findMembershipId(req)
      if (!membershipId) return res.status(401).json({ error: 'Unauthorized' })
      const unread = await InboxService.getUnreadCount(membershipId)
      return res.status(200).json({ data: unread })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your unread messages' })
    }
  },
}
