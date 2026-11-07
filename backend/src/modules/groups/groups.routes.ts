import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { GroupController } from './groups.controller.ts'
import { enrolmentParamSchema, groupEnrolmentSchema, groupMoveSchema, groupParamSchema, groupSchema, groupSubstitutionSchema, listGroupsQuerySchema, newGroupSchema, substitutionParamSchema } from './groups.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_COURSES read or change groups.
const router = Router()

const GROUPS = '/:organizationId/groups'
const GROUP = `${GROUPS}/:groupId`

const SUBSTITUTION = `${GROUP}/substitutions/:substitutionId`

const ENROLMENT = `${GROUP}/enrolments/:enrolmentId`

const canManage = requirePermission('MANAGE_COURSES')

router.get(GROUPS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(listGroupsQuerySchema, 'query'), GroupController.listGroups)

// Before the /:groupId routes, so "lecturer-options" and "student-options" are never read as a group id
router.get(`${GROUPS}/lecturer-options`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, GroupController.listLecturerOptions)

router.get(`${GROUPS}/student-options`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, GroupController.listStudentOptions)

router.post(GROUPS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(newGroupSchema), GroupController.createGroup)

router.get(GROUP, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.getGroup)

router.put(GROUP, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, validateRequestMiddleware(groupSchema), GroupController.updateGroup)

router.get(`${GROUP}/lecturers`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.getLecturerHistory)

router.post(`${GROUP}/substitutions`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, validateRequestMiddleware(groupSubstitutionSchema), GroupController.addSubstitution)

router.put(SUBSTITUTION, authMiddleware, validateRequestMiddleware(substitutionParamSchema, 'params'), canManage, validateRequestMiddleware(groupSubstitutionSchema), GroupController.updateSubstitution)

router.post(`${SUBSTITUTION}/cancel`, authMiddleware, validateRequestMiddleware(substitutionParamSchema, 'params'), canManage, GroupController.cancelSubstitution)

router.get(`${GROUP}/enrolments`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.listEnrolments)

router.post(`${GROUP}/enrolments`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, validateRequestMiddleware(groupEnrolmentSchema), GroupController.enrolStudent)

router.post(`${ENROLMENT}/withdraw`, authMiddleware, validateRequestMiddleware(enrolmentParamSchema, 'params'), canManage, GroupController.withdrawStudent)

router.post(`${ENROLMENT}/move`, authMiddleware, validateRequestMiddleware(enrolmentParamSchema, 'params'), canManage, validateRequestMiddleware(groupMoveSchema), GroupController.moveStudent)

router.post(`${GROUP}/archive`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.archiveGroup)

router.post(`${GROUP}/restore`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.restoreGroup)

export default router
