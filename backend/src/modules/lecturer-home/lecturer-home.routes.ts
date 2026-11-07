import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { LecturerHomeController } from './lecturer-home.controller.ts'

// Mounted at /api/organizations. Only the organization's lecturers read it, and only about themselves.
const router = Router()

router.get('/:organizationId/me/lecturer', authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), requireMembership(['LECTURER']), LecturerHomeController.getMyTeaching)

export default router
