import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { LocationService } from './location.service.ts'
import type { LocationInput, LocationParam, RemoveLocationQuery } from './location.types.ts'

type CreateLocationRequest = AuthRequest & TypedRequest<LocationInput, OrganizationIdParam>

type UpdateLocationRequest = AuthRequest & TypedRequest<LocationInput, LocationParam>

type RemoveLocationRequest = AuthRequest & TypedRequest<unknown, LocationParam, RemoveLocationQuery>

export const LocationController = {
  listLocations: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const locations = await LocationService.listLocations(req.params.organizationId)
      return res.status(200).json({ data: locations })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch locations' })
    }
  },

  createLocation: async (req: CreateLocationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const location = await LocationService.createLocation({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: location })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the location' })
    }
  },

  updateLocation: async (req: UpdateLocationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const location = await LocationService.updateLocation({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: location })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the location' })
    }
  },

  removeLocation: async (req: RemoveLocationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await LocationService.removeLocation({ ...req.params, actorId, newMainId: req.query.newMainId })
      return res.status(200).json({ message: 'Location removed' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the location' })
    }
  },
}
