import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { StudentController } from './students.controller.ts'
import { createStudentSchema, listStudentsQuerySchema, studentParamSchema, updateStudentSchema } from './students.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_STUDENTS read or change student records.
const router = Router()

const STUDENTS = '/:organizationId/students'
const STUDENT = `${STUDENTS}/:studentId`

const canManage = requirePermission('MANAGE_STUDENTS')

router.get(
  STUDENTS,
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(listStudentsQuerySchema, 'query'),
  StudentController.listStudents,
)

router.post(STUDENTS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(createStudentSchema), StudentController.createStudent)

router.get(STUDENT, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, StudentController.getStudent)

router.put(STUDENT, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, validateRequestMiddleware(updateStudentSchema), StudentController.updateStudent)

router.post(`${STUDENT}/archive`, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, StudentController.archiveStudent)

router.post(`${STUDENT}/restore`, authMiddleware, validateRequestMiddleware(studentParamSchema, 'params'), canManage, StudentController.restoreStudent)

export default router
