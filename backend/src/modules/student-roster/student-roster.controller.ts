import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { isRosterManager } from './roster-manager.ts'
import { StudentRosterService } from './student-roster.service.ts'
import type { StudentRosterParam } from './student-roster.types.ts'

type RosterRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type StudentRequest = AuthRequest & TypedRequest<unknown, StudentRosterParam>

/** Who is asking, and whether they manage courses or students in the organization in the path; the route already let them through */
const getViewer = (req: RosterRequest | StudentRequest) => {
  const user = req.user
  if (!user) return null
  const membership = user.memberships.find((item) => item.organization.id === req.params.organizationId)
  return { userId: user.id, isManager: !!membership && isRosterManager(membership) }
}

export const StudentRosterController = {
  listRoster: async (req: RosterRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const roster = await StudentRosterService.listRoster({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: roster })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your students' })
    }
  },

  getStudentDetail: async (req: StudentRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const detail = await StudentRosterService.getStudentDetail({ organizationId: req.params.organizationId, viewer, studentId: req.params.studentId })
      return res.status(200).json({ data: detail })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch this student' })
    }
  },
}
