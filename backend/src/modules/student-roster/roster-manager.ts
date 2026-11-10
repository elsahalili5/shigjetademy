import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { PermissionMembership } from '@shigjetademy/shared/auth'

/** The owner, or a school admin who manages courses or students: they read every student, not only those of the groups they teach */
export const isRosterManager = (membership: PermissionMembership) =>
  hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) || hasOrganizationPermission({ membership, permission: 'MANAGE_STUDENTS' })
