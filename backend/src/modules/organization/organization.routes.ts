import { Router } from 'express'
import { ROLES } from '@lib/roles.ts'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { roleMiddleware } from '@shared/middleware/roleMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { OrganizationController } from './organization.controller.ts'
import { createOrganizationSchema, organizationIdParamSchema, updateOrganizationStatusSchema } from './organization.schema.ts'

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

export default router
