import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { GroupController } from './groups.controller.ts'
import { groupParamSchema, groupSchema, groupSubstitutionSchema, listGroupsQuerySchema, substitutionParamSchema } from './groups.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_COURSES read or change groups.
const router = Router()

const GROUPS = '/:organizationId/groups'
const GROUP = `${GROUPS}/:groupId`

const SUBSTITUTION = `${GROUP}/substitutions/:substitutionId`

const canManage = requirePermission('MANAGE_COURSES')

router.get(GROUPS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(listGroupsQuerySchema, 'query'), GroupController.listGroups)

// Before the /:groupId routes, so "lecturer-options" is never read as a group id
router.get(`${GROUPS}/lecturer-options`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, GroupController.listLecturerOptions)

router.post(GROUPS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(groupSchema), GroupController.createGroup)

router.put(GROUP, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, validateRequestMiddleware(groupSchema), GroupController.updateGroup)

router.get(`${GROUP}/lecturers`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.getLecturerHistory)

router.post(`${GROUP}/substitutions`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, validateRequestMiddleware(groupSubstitutionSchema), GroupController.addSubstitution)

router.put(SUBSTITUTION, authMiddleware, validateRequestMiddleware(substitutionParamSchema, 'params'), canManage, validateRequestMiddleware(groupSubstitutionSchema), GroupController.updateSubstitution)

router.post(`${SUBSTITUTION}/cancel`, authMiddleware, validateRequestMiddleware(substitutionParamSchema, 'params'), canManage, GroupController.cancelSubstitution)

router.post(`${GROUP}/archive`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.archiveGroup)

router.post(`${GROUP}/restore`, authMiddleware, validateRequestMiddleware(groupParamSchema, 'params'), canManage, GroupController.restoreGroup)

export default router
