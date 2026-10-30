import type { Request, Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import { listActivityQuerySchema } from './activity.schema.ts'
import { ActivityService } from './activity.service.ts'

export const ActivityController = {
  listActivity: async (req: Request, res: Response) => {
    try {
      // The route already answered 400 for a bad query; parsing again types the coerced values
      const entries = await ActivityService.listActivity(listActivityQuerySchema.parse(req.query))
      return res.status(200).json({ data: entries })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch activity' })
    }
  },
}
