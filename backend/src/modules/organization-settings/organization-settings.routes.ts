import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership, requireMembershipWhileDeactivated } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { OrganizationSettingsController } from './organization-settings.controller.ts'
import { deactivateOrganizationSchema, reactivateOrganizationSchema, transferOwnershipSchema, updateOrganizationSettingsSchema } from './organization-settings.schema.ts'

// Mounted at /api/organizations. Only the owner reaches the organization's settings; reading them and reactivating still work while they have it deactivated.
const router = Router()

router.get(
  '/:organizationId/settings',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembershipWhileDeactivated(['OWNER']),
  OrganizationSettingsController.getSettings,
)

router.put(
  '/:organizationId/settings',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(updateOrganizationSettingsSchema),
  OrganizationSettingsController.updateSettings,
)

router.post(
  '/:organizationId/settings/transfer-ownership',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(transferOwnershipSchema),
  OrganizationSettingsController.transferOwnership,
)

router.post(
  '/:organizationId/settings/deactivate',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(deactivateOrganizationSchema),
  OrganizationSettingsController.deactivateOrganization,
)

router.post(
  '/:organizationId/settings/reactivate',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembershipWhileDeactivated(['OWNER']),
  validateRequestMiddleware(reactivateOrganizationSchema),
  OrganizationSettingsController.reactivateOrganization,
)

export default router
