import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always links families to students; a school admin only with the permission in this organization */
export const isGuardiansManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_GUARDIANS' })
