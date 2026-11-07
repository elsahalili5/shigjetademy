import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { GroupLecturerService } from './group-lecturers.service.ts'
import { GroupService } from './groups.service.ts'
import { listGroupsQuerySchema } from './groups.schema.ts'
import type { GroupInput, GroupParam, GroupSubstitutionInput, SubstitutionParam } from './groups.types.ts'

type CreateGroupRequest = AuthRequest & TypedRequest<GroupInput, OrganizationIdParam>

type UpdateGroupRequest = AuthRequest & TypedRequest<GroupInput, GroupParam>

type AddSubstitutionRequest = AuthRequest & TypedRequest<GroupSubstitutionInput, GroupParam>

type UpdateSubstitutionRequest = AuthRequest & TypedRequest<GroupSubstitutionInput, SubstitutionParam>

type SubstitutionRequest = AuthRequest & TypedRequest<unknown, SubstitutionParam>

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

  listLecturerOptions: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const options = await GroupLecturerService.listLecturerOptions(req.params.organizationId)
      return res.status(200).json({ data: options })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the lecturers' })
    }
  },

  getLecturerHistory: async (req: GroupRequest, res: Response) => {
    try {
      const history = await GroupLecturerService.getLecturerHistory(req.params)
      return res.status(200).json({ data: history })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the group’s lecturers' })
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

  addSubstitution: async (req: AddSubstitutionRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const substitution = await GroupLecturerService.addSubstitution({ ...req.params, actorId, data: req.body })
      return res.status(201).json({ data: substitution })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the substitution' })
    }
  },

  updateSubstitution: async (req: UpdateSubstitutionRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const substitution = await GroupLecturerService.updateSubstitution({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: substitution })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the substitution' })
    }
  },

  cancelSubstitution: async (req: SubstitutionRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const substitution = await GroupLecturerService.cancelSubstitution({ ...req.params, actorId })
      return res.status(200).json({ data: substitution })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to cancel the substitution' })
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
