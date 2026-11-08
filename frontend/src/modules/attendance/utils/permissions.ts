import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always takes and corrects registers; a school admin only with the permission in this organization */
export const isAttendanceManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_ATTENDANCE' })

/** Attendance managers, and lecturers for the groups they teach, which the server checks per register */
export const isAttendanceTaker = (membership: SessionMembership | undefined) => isAttendanceManager(membership) || isOrganizationLecturer(membership)
