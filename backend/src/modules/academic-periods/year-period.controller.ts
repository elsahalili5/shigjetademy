import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { yearPeriodService } from './year-period.service.ts'
import type { YearPeriodKind } from './year-period.service.ts'
import type { AcademicTermInput, HolidayParam, TermParam, YearParam } from './academic-periods.types.ts'

type PeriodParam = TermParam | HolidayParam

type CreatePeriodRequest = AuthRequest & TypedRequest<AcademicTermInput, YearParam>

type UpdatePeriodRequest = AuthRequest & TypedRequest<AcademicTermInput, PeriodParam>

type RemovePeriodRequest = AuthRequest & TypedRequest<unknown, PeriodParam>

// Terms are at /terms/:termId and holidays at /holidays/:holidayId
const periodIdOf = (params: PeriodParam) => ('termId' in params ? params.termId : params.holidayId)

/** The term or holiday endpoints; they take the same body and answer the same way */
export const yearPeriodController = (kind: YearPeriodKind) => {
  const service = yearPeriodService(kind)

  return {
    create: async (req: CreatePeriodRequest, res: Response) => {
      try {
        const actorId = req.user?.id
        if (!actorId) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
        const { organizationId, yearId } = req.params
        const period = await service.create({ organizationId, yearId, actorId, data: req.body })
        return res.status(201).json({ data: period })
      } catch (error) {
        return sendError({ res, error, fallback: `Failed to add the ${kind}` })
      }
    },

    update: async (req: UpdatePeriodRequest, res: Response) => {
      try {
        const actorId = req.user?.id
        if (!actorId) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
        const { organizationId, yearId } = req.params
        const period = await service.update({ organizationId, yearId, periodId: periodIdOf(req.params), actorId, data: req.body })
        return res.status(200).json({ data: period })
      } catch (error) {
        return sendError({ res, error, fallback: `Failed to save the ${kind}` })
      }
    },

    remove: async (req: RemovePeriodRequest, res: Response) => {
      try {
        const actorId = req.user?.id
        if (!actorId) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
        const { organizationId, yearId } = req.params
        await service.remove({ organizationId, yearId, periodId: periodIdOf(req.params), actorId })
        return res.status(200).json({ message: kind === 'term' ? 'Term deleted' : 'Holiday deleted' })
      } catch (error) {
        return sendError({ res, error, fallback: `Failed to delete the ${kind}` })
      }
    },
  }
}
