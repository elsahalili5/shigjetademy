import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { GradeService } from './grades.service.ts'
import type { GradeGroupQuery } from './grades.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type GradebookRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam, GradeGroupQuery>

/** The caller's seat in the organization of the path; the route already checked they may read grades there */
const findViewer = (req: AuthRequest): SpaceViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

export const GradeController = {
  listGroups: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const groups = await GradeService.listGroups({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: groups })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups' })
    }
  },

  getGradebook: async (req: GradebookRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const gradebook = await GradeService.getGradebook({ organizationId: req.params.organizationId, viewer, groupId: req.query.group_id })
      return res.status(200).json({ data: gradebook })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the gradebook' })
    }
  },

  listMine: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const grades = await GradeService.listMine({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: grades })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your grades' })
    }
  },
}
