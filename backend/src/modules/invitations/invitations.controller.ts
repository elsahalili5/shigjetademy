import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { StudentService } from '@modules/students/students.service.ts'
import type { StudentParam } from '@modules/students/students.types.ts'
import { InvitationService } from './invitations.service.ts'
import type { InvitationParam, InviteMemberInput, InviteStudentInput, TokenParam } from './invitations.types.ts'

type InviteAdminRequest = AuthRequest & TypedRequest<InviteMemberInput, OrganizationIdParam>

type AdminInvitationRequest = AuthRequest & TypedRequest<unknown, InvitationParam>

type InviteStudentRequest = AuthRequest & TypedRequest<InviteStudentInput, StudentParam>

type StudentInvitationRequest = AuthRequest & TypedRequest<unknown, StudentParam>

export const InvitationController = {
  inviteAdmin: async (req: InviteAdminRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const invitation = await InvitationService.createInvitation({
        organizationId: req.params.organizationId,
        actorId,
        email: req.body.email,
        target: { role: 'ADMIN', permissions: req.body.permissions },
      })
      return res.status(201).json({ data: invitation })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the invitation' })
    }
  },

  resendAdminInvitation: async (req: AdminInvitationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, invitationId } = req.params
      const { invitation } = await InvitationService.resendInvitation({ organizationId, actorId, match: { invitationId } })
      return res.status(200).json({ data: invitation })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to resend the invitation' })
    }
  },

  // The owner's Copy link: the only answer that carries a raw link
  renewAdminInvitationLink: async (req: AdminInvitationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, invitationId } = req.params
      const { invitation, link } = await InvitationService.resendInvitation({ organizationId, actorId, match: { invitationId } })
      return res.status(200).json({ data: { ...invitation, link } })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to make a new link' })
    }
  },

  revokeAdminInvitation: async (req: AdminInvitationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, invitationId } = req.params
      await InvitationService.revokeInvitation({ organizationId, actorId, match: { invitationId } })
      return res.status(204).send()
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to revoke the invitation' })
    }
  },

  inviteStudent: async (req: InviteStudentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, studentId } = req.params
      await InvitationService.createInvitation({ organizationId, actorId, email: req.body.email, target: { role: 'STUDENT', studentId } })
      return res.status(201).json({ data: await StudentService.getStudent({ organizationId, studentId }) })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the invitation' })
    }
  },

  resendStudentInvitation: async (req: StudentInvitationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, studentId } = req.params
      await InvitationService.resendInvitation({ organizationId, actorId, match: { studentId } })
      return res.status(200).json({ data: await StudentService.getStudent({ organizationId, studentId }) })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to resend the invitation' })
    }
  },

  revokeStudentInvitation: async (req: StudentInvitationRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { organizationId, studentId } = req.params
      await InvitationService.revokeInvitation({ organizationId, actorId, match: { studentId } })
      return res.status(200).json({ data: await StudentService.getStudent({ organizationId, studentId }) })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to revoke the invitation' })
    }
  },

  previewInvitation: async (req: TypedRequest<unknown, TokenParam>, res: Response) => {
    try {
      const invitation = await InvitationService.previewInvitation(req.params.token)
      return res.status(200).json({ data: invitation })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to read the invitation' })
    }
  },

  acceptInvitation: async (req: AuthRequest & TypedRequest<unknown, TokenParam>, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const accepted = await InvitationService.acceptInvitation({ token: req.params.token, user: req.user })
      return res.status(200).json({ data: accepted })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to accept the invitation' })
    }
  },
}
