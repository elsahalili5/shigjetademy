import { Router } from 'express'
import { ROLES } from '@lib/roles.ts'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { roleMiddleware } from '@shared/middleware/roleMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { UserController } from './user.controller.ts'
import { updateUserSchema, userIdParamSchema } from './user.schema.ts'

const router = Router()

router.use(authMiddleware, roleMiddleware([ROLES.PLATFORM_ADMIN]))

router.get('/', UserController.getUsers)

router.get('/:userId', validateRequestMiddleware(userIdParamSchema, 'params'), UserController.getUserById)

router.put(
  '/:userId',
  validateRequestMiddleware(userIdParamSchema, 'params'),
  validateRequestMiddleware(updateUserSchema),
  UserController.updateUser,
)

router.delete('/:userId', validateRequestMiddleware(userIdParamSchema, 'params'), UserController.deleteUser)

export default router
