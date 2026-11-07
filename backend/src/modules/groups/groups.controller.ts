import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { GroupService } from './groups.service.ts'
import { listGroupsQuerySchema } from './groups.schema.ts'
import type { GroupInput, GroupParam } from './groups.types.ts'

type CreateGroupRequest = AuthRequest & TypedRequest<GroupInput, OrganizationIdParam>

type UpdateGroupRequest = AuthRequest & TypedRequest<GroupInput, GroupParam>

type GroupRequest = AuthRequest & TypedRequest<unknown, GroupParam>

export const GroupController = {
  listGroups: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      // The route already answered 400 for a bad query; parsing again types the coerced values
      const page = await GroupService.listGroups({ organizationId: req.params.organizationId, query: listGroupsQuerySchema.parse(req.query) })
      return res.status(200).json({ data: page })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch groups' })
    }
  },

  createGroup: async (req: CreateGroupRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const group = await GroupService.createGroup({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: group })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the group' })
    }
  },

  updateGroup: async (req: UpdateGroupRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const group = await GroupService.updateGroup({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: group })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the group' })
    }
  },

  archiveGroup: async (req: GroupRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const group = await GroupService.setGroupStatus({ ...req.params, actorId, status: 'ARCHIVED' })
      return res.status(200).json({ data: group })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to archive the group' })
    }
  },

  restoreGroup: async (req: GroupRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const group = await GroupService.setGroupStatus({ ...req.params, actorId, status: 'ACTIVE' })
      return res.status(200).json({ data: group })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to restore the group' })
    }
  },
}
