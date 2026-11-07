import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always keeps courses and groups; a school admin only with the permission in this organization */
export const isCoursesManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' })
