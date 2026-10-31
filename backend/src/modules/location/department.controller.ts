import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { DepartmentService } from './department.service.ts'
import type { DepartmentInput, DepartmentParam } from './location.types.ts'

type CreateDepartmentRequest = AuthRequest & TypedRequest<DepartmentInput, OrganizationIdParam>

type UpdateDepartmentRequest = AuthRequest & TypedRequest<DepartmentInput, DepartmentParam>

type RemoveDepartmentRequest = AuthRequest & TypedRequest<unknown, DepartmentParam>

export const DepartmentController = {
  listDepartments: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const departments = await DepartmentService.listDepartments(req.params.organizationId)
      return res.status(200).json({ data: departments })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch departments' })
    }
  },

  createDepartment: async (req: CreateDepartmentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const department = await DepartmentService.createDepartment({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: department })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the department' })
    }
  },

  updateDepartment: async (req: UpdateDepartmentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const department = await DepartmentService.updateDepartment({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: department })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the department' })
    }
  },

  removeDepartment: async (req: RemoveDepartmentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await DepartmentService.removeDepartment({ ...req.params, actorId })
      return res.status(200).json({ message: 'Department removed' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the department' })
    }
  },
}
