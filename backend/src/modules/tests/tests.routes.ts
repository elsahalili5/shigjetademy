import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { TestController } from './tests.controller.ts'
import { createTestSchema, recordTestResultsSchema, testGroupQuerySchema, testParamSchema, updateTestSchema } from './tests.schema.ts'

// Mounted at /api/organizations. The owner, admins with MANAGE_TESTS, lecturers and students use tests; guardians and other admins don't.
// Which groups a person reaches, and what they may do there, is decided by the service.
const router = Router()

const TESTS = '/:organizationId/tests'
const TEST = `${TESTS}/:testId`

const usesTests = requireOrganizationAccess({
  isAllowed: (membership) => membership.role === 'LECTURER' || membership.role === 'STUDENT' || hasOrganizationPermission({ membership, permission: 'MANAGE_TESTS' }),
})
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const testParam = validateRequestMiddleware(testParamSchema, 'params')

router.get(`${TESTS}/groups`, authMiddleware, organizationParam, usesTests, TestController.listGroups)

// A student's tests across all their groups, with their own results
router.get(`${TESTS}/mine`, authMiddleware, organizationParam, usesTests, TestController.listMine)

router.get(TESTS, authMiddleware, organizationParam, usesTests, validateRequestMiddleware(testGroupQuerySchema, 'query'), TestController.list)

router.post(TESTS, authMiddleware, organizationParam, usesTests, validateRequestMiddleware(createTestSchema), TestController.create)

// For the group's setters: the test with every enrolled student's result
router.get(TEST, authMiddleware, testParam, usesTests, TestController.getSheet)

router.put(TEST, authMiddleware, testParam, usesTests, validateRequestMiddleware(updateTestSchema), TestController.update)

// Deletes the test and its results
router.delete(TEST, authMiddleware, testParam, usesTests, TestController.remove)

// The whole results sheet at once, editable later
router.put(`${TEST}/results`, authMiddleware, testParam, usesTests, validateRequestMiddleware(recordTestResultsSchema), TestController.recordResults)

export default router
