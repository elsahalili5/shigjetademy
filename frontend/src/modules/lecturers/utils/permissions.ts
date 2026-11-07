import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always keeps lecturer records; a school admin only with the permission in this organization */
export const isLecturersManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_LECTURERS' })
