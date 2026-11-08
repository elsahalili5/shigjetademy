import type { Response } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { LessonPlanService } from './lesson-plans.service.ts'
import { lessonPlanSessionsQuerySchema } from './lesson-plans.schema.ts'
import type { LessonPlanCoveredInput, LessonPlanGroupParam, LessonPlanParam, LessonPlanTopicInput } from './lesson-plans.types.ts'

type SessionsRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type GroupPlansRequest = AuthRequest & TypedRequest<unknown, LessonPlanGroupParam>

type PlanRequest = AuthRequest & TypedRequest<unknown, LessonPlanParam>

type WriteTopicRequest = AuthRequest & TypedRequest<LessonPlanTopicInput, LessonPlanParam>

type WriteCoveredRequest = AuthRequest & TypedRequest<LessonPlanCoveredInput, LessonPlanParam>

/** Who is asking, and whether they manage courses in the organization in the path; the route already let them through */
const getViewer = (req: SessionsRequest | GroupPlansRequest | PlanRequest | WriteTopicRequest | WriteCoveredRequest) => {
  const user = req.user
  if (!user) return null
  const membership = user.memberships.find((item) => item.organization.id === req.params.organizationId)
  return { userId: user.id, isManager: !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) }
}

export const LessonPlanController = {
  listSessions: async (req: SessionsRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      // The route already answered 400 for a bad query; parsing again types it
      const { date } = lessonPlanSessionsQuerySchema.parse(req.query)
      const sessions = await LessonPlanService.listSessions({ organizationId: req.params.organizationId, viewer, date })
      return res.status(200).json({ data: sessions })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the day’s lessons' })
    }
  },

  listGroupPlans: async (req: GroupPlansRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const plans = await LessonPlanService.listGroupPlans({ ...req.params, viewer })
      return res.status(200).json({ data: plans })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the group’s lesson plans' })
    }
  },

  getPlan: async (req: PlanRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const plan = await LessonPlanService.getPlan({ ...req.params, viewer })
      return res.status(200).json({ data: plan })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the lesson plan' })
    }
  },

  writeTopic: async (req: WriteTopicRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const plan = await LessonPlanService.writeTopic({ ...req.params, viewer, topic: req.body.topic })
      return res.status(200).json({ data: plan })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the topic' })
    }
  },

  writeCovered: async (req: WriteCoveredRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const plan = await LessonPlanService.writeCovered({ ...req.params, viewer, covered: req.body.covered })
      return res.status(200).json({ data: plan })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save what was covered' })
    }
  },
}
