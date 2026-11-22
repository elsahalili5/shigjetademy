import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { GradeController } from './grades.controller.ts'
import { gradeGroupQuerySchema } from './grades.schema.ts'

// Mounted at /api/organizations. Read-only: the owner, admins with MANAGE_GRADES and lecturers read gradebooks, and students their own grades.
// Guardians read a linked child's grades through my-children; other admins don't. Which groups a person reaches is decided by the service.
const router = Router()

const GRADES = '/:organizationId/grades'

const usesGrades = requireOrganizationAccess({
  isAllowed: (membership) => membership.role === 'LECTURER' || membership.role === 'STUDENT' || hasOrganizationPermission({ membership, permission: 'MANAGE_GRADES' }),
})
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')

router.get(`${GRADES}/groups`, authMiddleware, organizationParam, usesGrades, GradeController.listGroups)

// A student's own results across all their groups
router.get(`${GRADES}/mine`, authMiddleware, organizationParam, usesGrades, GradeController.listMine)

// One group's students by assignments with points and tests
router.get(GRADES, authMiddleware, organizationParam, usesGrades, validateRequestMiddleware(gradeGroupQuerySchema, 'query'), GradeController.getGradebook)

export default router
