import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import type { StudentParam } from '@modules/students/students.types.ts'
import { MyChildrenService } from './my-children.service.ts'

export const MyChildrenController = {
  listMyChildren: async (req: AuthRequest & TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const children = await MyChildrenService.listMyChildren({ organizationId: req.params.organizationId, userId })
      return res.status(200).json({ data: children })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your children' })
    }
  },

  getMyChild: async (req: AuthRequest & TypedRequest<unknown, StudentParam>, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const child = await MyChildrenService.getMyChild({ ...req.params, userId })
      return res.status(200).json({ data: child })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your child' })
    }
  },
}
