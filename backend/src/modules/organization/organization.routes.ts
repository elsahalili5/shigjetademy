import { Router } from 'express'
import { ROLES } from '@lib/roles.ts'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { roleMiddleware } from '@shared/middleware/roleMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { OrganizationController } from './organization.controller.ts'
import {
  createOrganizationSchema,
  membershipParamSchema,
  organizationIdParamSchema,
  updateMemberSchema,
  updateOrganizationStatusSchema,
} from './organization.schema.ts'

const router = Router()

router.post('/', authMiddleware, validateRequestMiddleware(createOrganizationSchema), OrganizationController.createOrganization)

// Platform admin only: every client organization and the platform's numbers
router.get('/', authMiddleware, roleMiddleware([ROLES.PLATFORM_ADMIN]), OrganizationController.listOrganizations)

router.get('/stats', authMiddleware, roleMiddleware([ROLES.PLATFORM_ADMIN]), OrganizationController.getPlatformStats)

router.get(
  '/:organizationId',
  authMiddleware,
  roleMiddleware([ROLES.PLATFORM_ADMIN]),
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  OrganizationController.getOrganization,
)

router.patch(
  '/:organizationId/status',
  authMiddleware,
  roleMiddleware([ROLES.PLATFORM_ADMIN]),
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  validateRequestMiddleware(updateOrganizationStatusSchema),
  OrganizationController.updateOrganizationStatus,
)

router.get(
  '/:organizationId/members',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  OrganizationController.listMembers,
)

router.get(
  '/:organizationId/invitations',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  OrganizationController.listPendingInvitations,
)

router.patch(
  '/:organizationId/members/:membershipId',
  authMiddleware,
  validateRequestMiddleware(membershipParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(updateMemberSchema),
  OrganizationController.updateMember,
)

router.delete(
  '/:organizationId/members/:membershipId',
  authMiddleware,
  validateRequestMiddleware(membershipParamSchema, 'params'),
  requireMembership(['OWNER']),
  OrganizationController.removeMember,
)

export default router
