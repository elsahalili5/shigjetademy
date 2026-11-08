import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { AttendanceController } from './attendance.controller.ts'
import { attendanceGroupsQuerySchema, attendanceMarkSchema, registerParamSchema, registerStudentParamSchema } from './attendance.schema.ts'

// Mounted at /api/organizations. The owner and school admins with MANAGE_ATTENDANCE take or correct any register;
// a lecturer only the registers of groups they teach on that day, which the service checks. A register is one session, addressed by its start time ('HH:MM').
const router = Router()

const GROUPS = '/:organizationId/attendance/groups'
const REGISTER = `${GROUPS}/:groupId/:date/:startTime`

const canTakeAttendance = requireOrganizationAccess({ isAllowed: (membership) => membership.role === 'LECTURER' || hasOrganizationPermission({ membership, permission: 'MANAGE_ATTENDANCE' }) })

router.get(GROUPS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canTakeAttendance, validateRequestMiddleware(attendanceGroupsQuerySchema, 'query'), AttendanceController.listGroups)

router.get(REGISTER, authMiddleware, validateRequestMiddleware(registerParamSchema, 'params'), canTakeAttendance, AttendanceController.getRegister)

router.put(`${REGISTER}/students/:studentId`, authMiddleware, validateRequestMiddleware(registerStudentParamSchema, 'params'), canTakeAttendance, validateRequestMiddleware(attendanceMarkSchema), AttendanceController.markStudent)

router.put(`${REGISTER}/mark-all-present`, authMiddleware, validateRequestMiddleware(registerParamSchema, 'params'), canTakeAttendance, AttendanceController.markAllPresent)

export default router
