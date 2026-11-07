import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { LecturerController } from './lecturers.controller.ts'
import { lecturerParamSchema, lecturerSchema, listLecturersQuerySchema } from './lecturers.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_LECTURERS read or change lecturer records.
const router = Router()

const LECTURERS = '/:organizationId/lecturers'
const LECTURER = `${LECTURERS}/:lecturerId`

const canManage = requirePermission('MANAGE_LECTURERS')

router.get(
  LECTURERS,
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(listLecturersQuerySchema, 'query'),
  LecturerController.listLecturers,
)

router.post(LECTURERS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(lecturerSchema), LecturerController.createLecturer)

// Before LECTURER, so "subjects" is never read as a lecturer id
router.get(`${LECTURERS}/subjects`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, LecturerController.listSubjects)

router.get(LECTURER, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManage, LecturerController.getLecturer)

router.put(LECTURER, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManage, validateRequestMiddleware(lecturerSchema), LecturerController.updateLecturer)

router.post(`${LECTURER}/archive`, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManage, LecturerController.archiveLecturer)

router.post(`${LECTURER}/restore`, authMiddleware, validateRequestMiddleware(lecturerParamSchema, 'params'), canManage, LecturerController.restoreLecturer)

export default router
