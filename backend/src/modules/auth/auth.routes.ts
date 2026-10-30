import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { AuthController } from './auth.controller.ts'
import { changePasswordSchema, logoutSchema, refreshTokenSchema, updateProfileSchema, userLoginSchema, userRegisterSchema } from './auth.schema.ts'

const router = Router()

router.post('/register', validateRequestMiddleware(userRegisterSchema), AuthController.registerUser)

router.post('/login', validateRequestMiddleware(userLoginSchema), AuthController.loginUser)

router.post('/refresh-token', validateRequestMiddleware(refreshTokenSchema), AuthController.refreshToken)

router.post('/logout', validateRequestMiddleware(logoutSchema), AuthController.logoutUser)

router.get('/me', authMiddleware, AuthController.me)

router.put('/me', authMiddleware, validateRequestMiddleware(updateProfileSchema), AuthController.updateProfile)

router.post('/change-password', authMiddleware, validateRequestMiddleware(changePasswordSchema), AuthController.changePassword)

export default router
