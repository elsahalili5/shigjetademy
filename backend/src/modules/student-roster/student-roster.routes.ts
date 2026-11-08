import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { StudentRosterController } from './student-roster.controller.ts'
import { studentRosterParamSchema } from './student-roster.schema.ts'

// Mounted at /api/organizations. The owner and admins with MANAGE_COURSES reach every active group's students;
// a lecturer only the students of the groups they currently, permanently teach, which the service checks.
const router = Router()

const ROSTER = '/:organizationId/my-students'
const STUDENT = `${ROSTER}/:studentId`

const canReadRoster = requireOrganizationAccess({ isAllowed: (membership) => membership.role === 'LECTURER' || hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) })

router.get(ROSTER, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canReadRoster, StudentRosterController.listRoster)

router.get(STUDENT, authMiddleware, validateRequestMiddleware(studentRosterParamSchema, 'params'), canReadRoster, StudentRosterController.getStudentDetail)

export default router
