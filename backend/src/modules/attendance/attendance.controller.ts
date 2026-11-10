import type { Response } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { AttendanceService } from './attendance.service.ts'
import { attendanceGroupsQuerySchema } from './attendance.schema.ts'
import type { AttendanceMarkInput, RegisterParam, RegisterStudentParam } from './attendance.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type RegisterRequest = AuthRequest & TypedRequest<unknown, RegisterParam>

type MarkStudentRequest = AuthRequest & TypedRequest<AttendanceMarkInput, RegisterStudentParam>

/** Who is asking, and whether they manage attendance in the organization in the path; the route already let them through */
const getViewer = (req: OrganizationRequest | RegisterRequest | MarkStudentRequest) => {
  const user = req.user
  if (!user) return null
  const membership = user.memberships.find((item) => item.organization.id === req.params.organizationId)
  return { userId: user.id, isManager: !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_ATTENDANCE' }) }
}

export const AttendanceController = {
  listGroups: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      // The route already answered 400 for a bad query; parsing again types it
      const { date } = attendanceGroupsQuerySchema.parse(req.query)
      const groups = await AttendanceService.listSessions({ organizationId: req.params.organizationId, viewer, date })
      return res.status(200).json({ data: groups })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the day’s lessons' })
    }
  },

  listHistory: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const history = await AttendanceService.listHistory({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: history })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the attendance history' })
    }
  },

  getRegister: async (req: RegisterRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const register = await AttendanceService.getRegister({ ...req.params, viewer })
      return res.status(200).json({ data: register })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the register' })
    }
  },

  markStudent: async (req: MarkStudentRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const student = await AttendanceService.markStudent({ ...req.params, viewer, status: req.body.status })
      return res.status(200).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the mark' })
    }
  },

  markAllPresent: async (req: RegisterRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const register = await AttendanceService.markAllPresent({ ...req.params, viewer })
      return res.status(200).json({ data: register })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to mark everyone present' })
    }
  },
}
