import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { LecturerService } from './lecturers.service.ts'
import { listLecturersQuerySchema } from './lecturers.schema.ts'
import type { LecturerInput, LecturerParam } from './lecturers.types.ts'

type CreateLecturerRequest = AuthRequest & TypedRequest<LecturerInput, OrganizationIdParam>

type UpdateLecturerRequest = AuthRequest & TypedRequest<LecturerInput, LecturerParam>

type LecturerRequest = AuthRequest & TypedRequest<unknown, LecturerParam>

export const LecturerController = {
  listLecturers: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      // The route already answered 400 for a bad query; parsing again types the coerced values
      const page = await LecturerService.listLecturers({ organizationId: req.params.organizationId, query: listLecturersQuerySchema.parse(req.query) })
      return res.status(200).json({ data: page })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch lecturers' })
    }
  },

  listSubjects: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const subjects = await LecturerService.listSubjects(req.params.organizationId)
      return res.status(200).json({ data: subjects })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch subjects' })
    }
  },

  getLecturer: async (req: LecturerRequest, res: Response) => {
    try {
      const lecturer = await LecturerService.getLecturer(req.params)
      return res.status(200).json({ data: lecturer })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the lecturer' })
    }
  },

  createLecturer: async (req: CreateLecturerRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const lecturer = await LecturerService.createLecturer({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: lecturer })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the lecturer' })
    }
  },

  updateLecturer: async (req: UpdateLecturerRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const lecturer = await LecturerService.updateLecturer({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: lecturer })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the lecturer' })
    }
  },

  archiveLecturer: async (req: LecturerRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const lecturer = await LecturerService.setLecturerStatus({ ...req.params, actorId, status: 'ARCHIVED' })
      return res.status(200).json({ data: lecturer })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to archive the lecturer' })
    }
  },

  restoreLecturer: async (req: LecturerRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const lecturer = await LecturerService.setLecturerStatus({ ...req.params, actorId, status: 'ACTIVE' })
      return res.status(200).json({ data: lecturer })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to restore the lecturer' })
    }
  },
}
