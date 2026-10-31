import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { AcademicYearService } from './academic-year.service.ts'
import type { AcademicYearInput, OrganizationParam, RemoveAcademicYearQuery, YearParam } from './academic-periods.types.ts'

type CreateYearRequest = AuthRequest & TypedRequest<AcademicYearInput, OrganizationParam>

type UpdateYearRequest = AuthRequest & TypedRequest<AcademicYearInput, YearParam>

type RemoveYearRequest = AuthRequest & TypedRequest<unknown, YearParam, RemoveAcademicYearQuery>

export const AcademicYearController = {
  listYears: async (req: TypedRequest<unknown, OrganizationParam>, res: Response) => {
    try {
      const years = await AcademicYearService.listYears(req.params.organizationId)
      return res.status(200).json({ data: years })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch academic years' })
    }
  },

  createYear: async (req: CreateYearRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const year = await AcademicYearService.createYear({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: year })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the academic year' })
    }
  },

  updateYear: async (req: UpdateYearRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const year = await AcademicYearService.updateYear({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: year })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the academic year' })
    }
  },

  removeYear: async (req: RemoveYearRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await AcademicYearService.removeYear({ ...req.params, actorId, newCurrentId: req.query.newCurrentId })
      return res.status(200).json({ message: 'Academic year deleted' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to delete the academic year' })
    }
  },
}
