import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { OrganizationService } from './organization.service.ts'
import type {
  CreateOrganizationInput,
  MembershipParam,
  OrganizationIdParam,
  UpdateMemberInput,
  UpdateOrganizationProfileInput,
  UpdateOrganizationStatusInput,
} from './organization.types.ts'

type CreateOrganizationRequest = AuthRequest & { body: CreateOrganizationInput }

type UpdateOrganizationStatusRequest = AuthRequest & TypedRequest<UpdateOrganizationStatusInput, OrganizationIdParam>

type UpdateProfileRequest = AuthRequest & TypedRequest<UpdateOrganizationProfileInput, OrganizationIdParam>

type UpdateMemberRequest = AuthRequest & TypedRequest<UpdateMemberInput, MembershipParam>

type RemoveMemberRequest = AuthRequest & TypedRequest<unknown, MembershipParam>

export const OrganizationController = {
  createOrganization: async (req: CreateOrganizationRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const organization = await OrganizationService.createOrganization({ userId, data: req.body })
      return res.status(201).json({ message: 'Organization created', data: organization })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to create organization' })
    }
  },

  listOrganizations: async (_req: AuthRequest, res: Response) => {
    try {
      const organizations = await OrganizationService.listOrganizations()
      return res.status(200).json({ data: organizations })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch organizations' })
    }
  },

  getPlatformStats: async (_req: AuthRequest, res: Response) => {
    try {
      const stats = await OrganizationService.getPlatformStats()
      return res.status(200).json({ data: stats })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch statistics' })
    }
  },

  getOrganization: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const organization = await OrganizationService.getOrganization(req.params.organizationId)
      return res.status(200).json({ data: organization })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch client' })
    }
  },

  updateOrganizationStatus: async (req: UpdateOrganizationStatusRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const organization = await OrganizationService.updateOrganizationStatus({
        organizationId: req.params.organizationId,
        actorId,
        data: req.body,
      })
      return res.status(200).json({ data: organization })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to update client' })
    }
  },

  listMembers: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const members = await OrganizationService.listMembers(req.params.organizationId)
      return res.status(200).json({ data: members })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch members' })
    }
  },

  getProfile: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const profile = await OrganizationService.getProfile(req.params.organizationId)
      return res.status(200).json({ data: profile })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the organization profile' })
    }
  },

  updateProfile: async (req: UpdateProfileRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const profile = await OrganizationService.updateProfile({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(200).json({ data: profile })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the organization profile' })
    }
  },

  getOverview: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const overview = await OrganizationService.getOverview(req.params.organizationId)
      return res.status(200).json({ data: overview })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the overview' })
    }
  },

  listPendingInvitations: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const invitations = await OrganizationService.listPendingInvitations(req.params.organizationId)
      return res.status(200).json({ data: invitations })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch invitations' })
    }
  },

  updateMember: async (req: UpdateMemberRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const member = await OrganizationService.updateMember({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: member })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to update member' })
    }
  },

  removeMember: async (req: RemoveMemberRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await OrganizationService.removeMember({ ...req.params, actorId })
      return res.status(200).json({ message: 'Member removed' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove member' })
    }
  },
}
