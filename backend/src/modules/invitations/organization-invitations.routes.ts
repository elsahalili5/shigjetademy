import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { studentParamSchema } from '@modules/students/students.schema.ts'
import { InvitationController } from './invitations.controller.ts'
import { invitationParamSchema, inviteMemberSchema, inviteStudentSchema } from './invitations.schema.ts'

// Mounted at /api/organizations. Only the owner invites school admins; the role is always ADMIN, never OWNER.
// A student's login invitation is for the owner and admins with MANAGE_STUDENTS, like the record itself.
const router = Router()

const INVITATIONS = '/:organizationId/invitations'
const INVITATION = `${INVITATIONS}/:invitationId`

const STUDENT_INVITATION = '/:organizationId/students/:studentId/invitation'

const isOwner = requireMembership(['OWNER'])

const canManageStudents = requirePermission('MANAGE_STUDENTS')

router.post(INVITATIONS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), isOwner, validateRequestMiddleware(inviteMemberSchema), InvitationController.inviteAdmin)

router.post(`${INVITATION}/resend`, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.resendAdminInvitation)

router.post(`${INVITATION}/link`, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.renewAdminInvitationLink)

router.delete(INVITATION, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.revokeAdminInvitation)

router.post(
  STUDENT_INVITATION,
  authMiddleware,
  validateRequestMiddleware(studentParamSchema, 'params'),
  canManageStudents,
  validateRequestMiddleware(inviteStudentSchema),
  InvitationController.inviteStudent,
)

router.post(`${STUDENT_INVITATION}/resend`, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManageStudents, InvitationController.resendStudentInvitation)

router.delete(STUDENT_INVITATION, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManageStudents, InvitationController.revokeStudentInvitation)

export default router
