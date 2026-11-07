import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { CourseController } from './courses.controller.ts'
import { courseParamSchema, courseSchema, listCoursesQuerySchema } from './courses.schema.ts'

// Mounted at /api/organizations. Only the owner and school admins with MANAGE_COURSES read or change courses.
const router = Router()

const COURSES = '/:organizationId/courses'
const COURSE = `${COURSES}/:courseId`

const canManage = requirePermission('MANAGE_COURSES')

router.get(COURSES, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(listCoursesQuerySchema, 'query'), CourseController.listCourses)

router.post(COURSES, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, validateRequestMiddleware(courseSchema), CourseController.createCourse)

router.get(`${COURSES}/options`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canManage, CourseController.listCourseOptions)

router.put(COURSE, authMiddleware, validateRequestMiddleware(courseParamSchema, 'params'), canManage, validateRequestMiddleware(courseSchema), CourseController.updateCourse)

router.post(`${COURSE}/archive`, authMiddleware, validateRequestMiddleware(courseParamSchema, 'params'), canManage, CourseController.archiveCourse)

router.post(`${COURSE}/restore`, authMiddleware, validateRequestMiddleware(courseParamSchema, 'params'), canManage, CourseController.restoreCourse)

export default router
