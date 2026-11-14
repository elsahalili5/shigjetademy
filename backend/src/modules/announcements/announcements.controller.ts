import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { AnnouncementService } from './announcements.service.ts'
import type { AnnouncementParam, AnnouncementViewer, CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type AnnouncementRequest = AuthRequest & TypedRequest<unknown, AnnouncementParam>

type CreateRequest = AuthRequest & TypedRequest<CreateAnnouncementInput, OrganizationIdParam>

type UpdateRequest = AuthRequest & TypedRequest<UpdateAnnouncementInput, AnnouncementParam>

/** The caller's seat in the organization of the path; the route already checked they are a member */
const findViewer = (req: AuthRequest): AnnouncementViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

export const AnnouncementController = {
  list: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const announcements = await AnnouncementService.list({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: announcements })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the announcements' })
    }
  },

  getUnreadCount: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const unread = await AnnouncementService.getUnreadCount({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: unread })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your unread announcements' })
    }
  },

  getAudienceOptions: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const options = await AnnouncementService.getAudienceOptions({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: options })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch who you can write to' })
    }
  },

  get: async (req: AnnouncementRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const announcement = await AnnouncementService.get({ ...req.params, viewer })
      return res.status(200).json({ data: announcement })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the announcement' })
    }
  },

  create: async (req: CreateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const announcement = await AnnouncementService.create({ organizationId: req.params.organizationId, viewer, data: req.body })
      return res.status(201).json({ data: announcement })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the announcement' })
    }
  },

  update: async (req: UpdateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const announcement = await AnnouncementService.update({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: announcement })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the announcement' })
    }
  },

  archive: async (req: AnnouncementRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const announcement = await AnnouncementService.archive({ ...req.params, viewer })
      return res.status(200).json({ data: announcement })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to archive the announcement' })
    }
  },
}
