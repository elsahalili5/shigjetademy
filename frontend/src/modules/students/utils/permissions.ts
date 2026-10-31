import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always keeps student records; a school admin only with the permission in this organization */
export const isStudentsManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_STUDENTS' })
