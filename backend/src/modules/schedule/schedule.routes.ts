import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requirePermission } from '@shared/middleware/permissionMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { ScheduleController } from './schedule.controller.ts'

// Mounted at /api/organizations. Timetable admins read the organization's weekly schedule, assembled from groups, meetings, rooms and lecturers.
const router = Router()

const canReadSchedule = requirePermission('MANAGE_SCHEDULES')

router.get('/:organizationId/schedule', authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canReadSchedule, ScheduleController.getSchedule)

export default router
