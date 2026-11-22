import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { isOrganizationLecturer, isOrganizationStudent } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner, school admins with Tests, lecturers and students use the page; guardians and other admins don't */
export const isTestsMember = (membership: SessionMembership | undefined) =>
  !!membership && (isOrganizationLecturer(membership) || isOrganizationStudent(membership) || hasOrganizationPermission({ membership, permission: 'MANAGE_TESTS' }))
