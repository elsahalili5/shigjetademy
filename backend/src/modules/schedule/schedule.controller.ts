import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { ScheduleService } from './schedule.service.ts'

export const ScheduleController = {
  getSchedule: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const schedule = await ScheduleService.getSchedule({ organizationId: req.params.organizationId })
      return res.status(200).json({ data: schedule })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the schedule' })
    }
  },
}
