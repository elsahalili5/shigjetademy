import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { DiscussionService } from './discussions.service.ts'
import type {
  CreateDiscussionTopicInput,
  DiscussionParam,
  DiscussionReplyInput,
  DiscussionReplyParam,
  DiscussionViewer,
  LockDiscussionTopicInput,
  PinDiscussionTopicInput,
  UpdateDiscussionTopicInput,
} from './discussions.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type TopicRequest = AuthRequest & TypedRequest<unknown, DiscussionParam>

type CreateRequest = AuthRequest & TypedRequest<CreateDiscussionTopicInput, OrganizationIdParam>

type UpdateRequest = AuthRequest & TypedRequest<UpdateDiscussionTopicInput, DiscussionParam>

type PinRequest = AuthRequest & TypedRequest<PinDiscussionTopicInput, DiscussionParam>

type LockRequest = AuthRequest & TypedRequest<LockDiscussionTopicInput, DiscussionParam>

type ReplyRequest = AuthRequest & TypedRequest<DiscussionReplyInput, DiscussionParam>

type ReplyUpdateRequest = AuthRequest & TypedRequest<DiscussionReplyInput, DiscussionReplyParam>

type ReplyRemoveRequest = AuthRequest & TypedRequest<unknown, DiscussionReplyParam>

/** The caller's seat in the organization of the path; the route already checked they are a member */
const findViewer = (req: AuthRequest): DiscussionViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

export const DiscussionController = {
  list: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topics = await DiscussionService.list({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: topics })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the discussions' })
    }
  },

  getUnreadCount: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const unread = await DiscussionService.getUnreadCount({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: unread })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your unread discussions' })
    }
  },

  listSpaces: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const spaces = await DiscussionService.listSpaces({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: spaces })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups and courses' })
    }
  },

  create: async (req: CreateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.create({ organizationId: req.params.organizationId, viewer, data: req.body })
      return res.status(201).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the topic' })
    }
  },

  get: async (req: TopicRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.get({ ...req.params, viewer })
      return res.status(200).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the topic' })
    }
  },

  update: async (req: UpdateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.update({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the topic' })
    }
  },

  remove: async (req: TopicRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.remove({ ...req.params, viewer })
      return res.status(200).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the topic' })
    }
  },

  pin: async (req: PinRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.pin({ ...req.params, viewer, isPinned: req.body.is_pinned })
      return res.status(200).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to pin the topic' })
    }
  },

  lock: async (req: LockRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const topic = await DiscussionService.lock({ ...req.params, viewer, isLocked: req.body.is_locked })
      return res.status(200).json({ data: topic })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to lock the topic' })
    }
  },

  reply: async (req: ReplyRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const reply = await DiscussionService.reply({ ...req.params, viewer, data: req.body })
      return res.status(201).json({ data: reply })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the reply' })
    }
  },

  updateReply: async (req: ReplyUpdateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const reply = await DiscussionService.updateReply({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: reply })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the reply' })
    }
  },

  removeReply: async (req: ReplyRemoveRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const reply = await DiscussionService.removeReply({ ...req.params, viewer })
      return res.status(200).json({ data: reply })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the reply' })
    }
  },
}
