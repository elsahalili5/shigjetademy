import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { MaterialController } from './materials.controller.ts'
import { createMaterialSchema, materialParamSchema, materialSpaceSchema, updateMaterialSchema } from './materials.schema.ts'

// Mounted at /api/organizations. The owner, admins with MANAGE_MATERIALS, lecturers and students use materials; guardians and other admins don't.
// Which spaces a person reads, and where they may share, is decided by the service.
const router = Router()

const MATERIALS = '/:organizationId/materials'
const MATERIAL = `${MATERIALS}/:materialId`

const usesMaterials = requireOrganizationAccess({
  isAllowed: (membership) => membership.role === 'LECTURER' || membership.role === 'STUDENT' || hasOrganizationPermission({ membership, permission: 'MANAGE_MATERIALS' }),
})
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const materialParam = validateRequestMiddleware(materialParamSchema, 'params')

router.get(MATERIALS, authMiddleware, organizationParam, usesMaterials, validateRequestMiddleware(materialSpaceSchema, 'query'), MaterialController.list)

router.get(`${MATERIALS}/spaces`, authMiddleware, organizationParam, usesMaterials, MaterialController.listSpaces)

router.post(MATERIALS, authMiddleware, organizationParam, usesMaterials, validateRequestMiddleware(createMaterialSchema), MaterialController.create)

// Multipart: the file and the fields beside it, checked once the file is read
router.post(`${MATERIALS}/files`, authMiddleware, organizationParam, usesMaterials, MaterialController.upload)

router.get(`${MATERIAL}/download`, authMiddleware, materialParam, usesMaterials, MaterialController.download)

router.put(MATERIAL, authMiddleware, materialParam, usesMaterials, validateRequestMiddleware(updateMaterialSchema), MaterialController.update)

// Deletes the row and its stored file
router.delete(MATERIAL, authMiddleware, materialParam, usesMaterials, MaterialController.remove)

export default router
