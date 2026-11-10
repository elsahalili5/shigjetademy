import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { studentParamSchema } from '@modules/students/students.schema.ts'
import { MyChildrenController } from './my-children.controller.ts'

// Mounted at /api/organizations. Only the organization's guardians read it, and only about their own linked children.
// Later modules add /me/children/:studentId/<module> routes here, behind requireMembership(['GUARDIAN']) and findLinkedChild.
const router = Router()

const CHILDREN = '/:organizationId/me/children'
const CHILD = `${CHILDREN}/:studentId`

const isGuardian = requireMembership(['GUARDIAN'])

router.get(CHILDREN, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), isGuardian, MyChildrenController.listMyChildren)

router.get(CHILD, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), isGuardian, MyChildrenController.getMyChild)

export default router
