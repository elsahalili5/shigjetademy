import { Router } from 'express'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { AcademicYearController } from './academic-year.controller.ts'
import { yearPeriodController } from './year-period.controller.ts'
import {
  academicHolidaySchema,
  academicTermSchema,
  academicYearSchema,
  holidayParamSchema,
  organizationParamSchema,
  removeAcademicYearQuerySchema,
  termParamSchema,
  yearParamSchema,
} from './academic-periods.schema.ts'

// Mounted at /api/organizations, with every path under /:organizationId/academic-periods.
// Every active member reads the calendar; the owner and school admins with MANAGE_ACADEMIC_PERIODS change it.
const router = Router()

const YEARS = '/:organizationId/academic-periods/years'
const YEAR = `${YEARS}/:yearId`
const TERMS = `${YEAR}/terms`
const TERM = `${TERMS}/:termId`
const HOLIDAYS = `${YEAR}/holidays`
const HOLIDAY = `${HOLIDAYS}/:holidayId`

const termController = yearPeriodController('term')
const holidayController = yearPeriodController('holiday')

const canRead = requireMembership([...MEMBER_ROLES])
const canManage = requirePermission('MANAGE_ACADEMIC_PERIODS')

router.get(YEARS, authMiddleware, validateRequestMiddleware(organizationParamSchema, 'params'), canRead, AcademicYearController.listYears)

router.post(
  YEARS,
  authMiddleware,
  validateRequestMiddleware(organizationParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(academicYearSchema),
  AcademicYearController.createYear,
)

router.put(YEAR, authMiddleware, validateRequestMiddleware(yearParamSchema, 'params'), canManage, validateRequestMiddleware(academicYearSchema), AcademicYearController.updateYear)

router.delete(
  YEAR,
  authMiddleware,
  validateRequestMiddleware(yearParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(removeAcademicYearQuerySchema, 'query'),
  AcademicYearController.removeYear,
)

router.post(TERMS, authMiddleware, validateRequestMiddleware(yearParamSchema, 'params'), canManage, validateRequestMiddleware(academicTermSchema), termController.create)

router.put(TERM, authMiddleware, validateRequestMiddleware(termParamSchema, 'params'), canManage, validateRequestMiddleware(academicTermSchema), termController.update)

router.delete(TERM, authMiddleware, validateRequestMiddleware(termParamSchema, 'params'), canManage, termController.remove)

router.post(
  HOLIDAYS,
  authMiddleware,
  validateRequestMiddleware(yearParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(academicHolidaySchema),
  holidayController.create,
)

router.put(
  HOLIDAY,
  authMiddleware,
  validateRequestMiddleware(holidayParamSchema, 'params'),
  canManage,
  validateRequestMiddleware(academicHolidaySchema),
  holidayController.update,
)

router.delete(HOLIDAY, authMiddleware, validateRequestMiddleware(holidayParamSchema, 'params'), canManage, holidayController.remove)

export default router
