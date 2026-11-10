import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { studentParamSchema } from '@modules/students/students.schema.ts'
import { GuardianController } from './guardians.controller.ts'
import { guardianSchema, studentGuardianParamSchema } from './guardians.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_GUARDIANS read or change a student's guardians.
const router = Router()

const GUARDIANS = '/:organizationId/students/:studentId/guardians'
const GUARDIAN = `${GUARDIANS}/:guardianId`

const canManage = requirePermission('MANAGE_GUARDIANS')

router.get(GUARDIANS, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, GuardianController.listStudentGuardians)

router.post(GUARDIANS, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, validateRequestMiddleware(guardianSchema), GuardianController.addStudentGuardian)

router.put(GUARDIAN, authMiddleware, validateRequestMiddleware(studentGuardianParamSchema, 'params'), canManage, validateRequestMiddleware(guardianSchema), GuardianController.updateStudentGuardian)

router.delete(GUARDIAN, authMiddleware, validateRequestMiddleware(studentGuardianParamSchema, 'params'), canManage, GuardianController.unlinkStudentGuardian)

export default router
