import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { guardianParamSchema } from '@modules/guardians/guardians.schema.ts'
import { lecturerParamSchema } from '@modules/lecturers/lecturers.schema.ts'
import { studentParamSchema } from '@modules/students/students.schema.ts'
import { InvitationController } from './invitations.controller.ts'
import { invitationParamSchema, inviteMemberSchema, inviteRecordSchema } from './invitations.schema.ts'

// Mounted at /api/organizations. Only the owner invites school admins; the role is always ADMIN, never OWNER.
// A student's login invitation is for the owner and admins with MANAGE_STUDENTS, like the record itself; a lecturer's for those with MANAGE_LECTURERS; a guardian's for those with MANAGE_GUARDIANS.
const router = Router()

const INVITATIONS = '/:organizationId/invitations'
const INVITATION = `${INVITATIONS}/:invitationId`

const STUDENT_INVITATION = '/:organizationId/students/:studentId/invitation'

const LECTURER_INVITATION = '/:organizationId/lecturers/:lecturerId/invitation'

const GUARDIAN_INVITATION = '/:organizationId/guardians/:guardianId/invitation'

const isOwner = requireMembership(['OWNER'])

const canManageStudents = requirePermission('MANAGE_STUDENTS')

const canManageLecturers = requirePermission('MANAGE_LECTURERS')

const canManageGuardians = requirePermission('MANAGE_GUARDIANS')

router.post(INVITATIONS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), isOwner, validateRequestMiddleware(inviteMemberSchema), InvitationController.inviteAdmin)

router.post(`${INVITATION}/resend`, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.resendAdminInvitation)

router.post(`${INVITATION}/link`, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.renewAdminInvitationLink)

router.delete(INVITATION, authMiddleware, validateRequestMiddleware(invitationParamSchema, 'params'), isOwner, InvitationController.revokeAdminInvitation)

router.post(
  STUDENT_INVITATION,
  authMiddleware,
  validateRequestMiddleware(studentParamSchema, 'params'),
  canManageStudents,
  validateRequestMiddleware(inviteRecordSchema),
  InvitationController.inviteStudent,
)

router.post(`${STUDENT_INVITATION}/resend`, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManageStudents, InvitationController.resendStudentInvitation)

router.delete(STUDENT_INVITATION, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManageStudents, InvitationController.revokeStudentInvitation)

router.post(
  LECTURER_INVITATION,
  authMiddleware,
  validateRequestMiddleware(lecturerParamSchema, 'params'),
  canManageLecturers,
  validateRequestMiddleware(inviteRecordSchema),
  InvitationController.inviteLecturer,
)

router.post(`${LECTURER_INVITATION}/resend`, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManageLecturers, InvitationController.resendLecturerInvitation)

router.delete(LECTURER_INVITATION, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManageLecturers, InvitationController.revokeLecturerInvitation)

router.post(GUARDIAN_INVITATION, authMiddleware, validateRequestMiddleware(guardianParamSchema, 'params'), canManageGuardians, InvitationController.inviteGuardian)

router.post(`${GUARDIAN_INVITATION}/resend`, authMiddleware, validateRequestMiddleware(guardianParamSchema, 'params'), canManageGuardians, InvitationController.resendGuardianInvitation)

router.delete(GUARDIAN_INVITATION, authMiddleware, validateRequestMiddleware(guardianParamSchema, 'params'), canManageGuardians, InvitationController.revokeGuardianInvitation)

export default router
