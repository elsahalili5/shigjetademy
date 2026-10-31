import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { OrganizationSettingsService } from './organization-settings.service.ts'
import type { DeactivateOrganizationInput, ReactivateOrganizationInput, TransferOwnershipInput, UpdateOrganizationSettingsInput } from './organization-settings.types.ts'

type UpdateSettingsRequest = AuthRequest & TypedRequest<UpdateOrganizationSettingsInput, OrganizationIdParam>

type TransferOwnershipRequest = AuthRequest & TypedRequest<TransferOwnershipInput, OrganizationIdParam>

type DeactivateOrganizationRequest = AuthRequest & TypedRequest<DeactivateOrganizationInput, OrganizationIdParam>

type ReactivateOrganizationRequest = AuthRequest & TypedRequest<ReactivateOrganizationInput, OrganizationIdParam>

export const OrganizationSettingsController = {
  getSettings: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const settings = await OrganizationSettingsService.getSettings(req.params.organizationId)
      return res.status(200).json({ data: settings })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the settings' })
    }
  },

  updateSettings: async (req: UpdateSettingsRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const settings = await OrganizationSettingsService.updateSettings({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(200).json({ data: settings })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the settings' })
    }
  },

  transferOwnership: async (req: TransferOwnershipRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await OrganizationSettingsService.transferOwnership({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(200).json({ message: 'Ownership transferred' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to transfer ownership' })
    }
  },

  deactivateOrganization: async (req: DeactivateOrganizationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await OrganizationSettingsService.deactivateOrganization({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(200).json({ data: { id: req.params.organizationId, status: 'DEACTIVATED' } })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to deactivate the organization' })
    }
  },

  reactivateOrganization: async (req: ReactivateOrganizationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await OrganizationSettingsService.reactivateOrganization({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(200).json({ data: { id: req.params.organizationId, status: 'ACTIVE' } })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to reactivate the organization' })
    }
  },
}
