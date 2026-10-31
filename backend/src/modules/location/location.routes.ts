import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { DepartmentController } from './department.controller.ts'
import { LocationController } from './location.controller.ts'
import { departmentParamSchema, departmentSchema, locationParamSchema, locationSchema, removeLocationQuerySchema } from './location.schema.ts'

// Mounted at /api/organizations. School admins read locations and departments; only the owner changes them.
const router = Router()

router.get(
  '/:organizationId/locations',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER', 'ADMIN']),
  LocationController.listLocations,
)

router.post(
  '/:organizationId/locations',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(locationSchema),
  LocationController.createLocation,
)

router.put(
  '/:organizationId/locations/:locationId',
  authMiddleware,
  validateRequestMiddleware(locationParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(locationSchema),
  LocationController.updateLocation,
)

router.delete(
  '/:organizationId/locations/:locationId',
  authMiddleware,
  validateRequestMiddleware(locationParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(removeLocationQuerySchema, 'query'),
  LocationController.removeLocation,
)

router.get(
  '/:organizationId/departments',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER', 'ADMIN']),
  DepartmentController.listDepartments,
)

router.post(
  '/:organizationId/departments',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(departmentSchema),
  DepartmentController.createDepartment,
)

router.put(
  '/:organizationId/departments/:departmentId',
  authMiddleware,
  validateRequestMiddleware(departmentParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(departmentSchema),
  DepartmentController.updateDepartment,
)

router.delete(
  '/:organizationId/departments/:departmentId',
  authMiddleware,
  validateRequestMiddleware(departmentParamSchema, 'params'),
  requireMembership(['OWNER']),
  DepartmentController.removeDepartment,
)

export default router
