import { Router } from 'express'
import { ROLES } from '@lib/roles.ts'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { roleMiddleware } from '@shared/middleware/roleMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { ActivityController } from './activity.controller.ts'
import { listActivityQuerySchema } from './activity.schema.ts'

const router = Router()

router.get(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.PLATFORM_ADMIN]),
  validateRequestMiddleware(listActivityQuerySchema, 'query'),
  ActivityController.listActivity,
)

export default router
