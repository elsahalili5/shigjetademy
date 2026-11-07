import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { LecturerHomeService } from './lecturer-home.service.ts'

export const LecturerHomeController = {
  getMyTeaching: async (req: AuthRequest & TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const myTeaching = await LecturerHomeService.getMyTeaching({ organizationId: req.params.organizationId, userId })
      return res.status(200).json({ data: myTeaching })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your teaching details' })
    }
  },
}
