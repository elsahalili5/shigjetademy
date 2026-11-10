import { Router } from 'express'
import { ROLES } from '@lib/roles.ts'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { roleMiddleware } from '@shared/middleware/roleMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { PlatformSettingsController } from './platform-settings.controller.ts'
import { updatePlatformSettingsSchema } from './platform-settings.schema.ts'

// Mounted at /api/platform. Platform admin only.
const router = Router()

router.get('/settings', authMiddleware, roleMiddleware([ROLES.PLATFORM_ADMIN]), PlatformSettingsController.getSettings)

router.put(
  '/settings',
  authMiddleware,
  roleMiddleware([ROLES.PLATFORM_ADMIN]),
  validateRequestMiddleware(updatePlatformSettingsSchema),
  PlatformSettingsController.updateSettings,
)

export default router
