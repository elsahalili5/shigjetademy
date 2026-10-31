import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always may change the calendar; a school admin only with the permission in this organization */
export const isAcademicPeriodsManager = (membership: SessionMembership | undefined) =>
  !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_ACADEMIC_PERIODS' })
