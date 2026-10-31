import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { StudentHomeService } from './student-home.service.ts'

export const StudentHomeController = {
  getMySchool: async (req: AuthRequest & TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const mySchool = await StudentHomeService.getMySchool({ organizationId: req.params.organizationId, userId })
      return res.status(200).json({ data: mySchool })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your school' })
    }
  },
}
