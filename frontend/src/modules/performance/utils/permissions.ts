import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner, school admins with Grades and lecturers read reports; students, guardians and other admins don't */
export const isReportsMember = (membership: SessionMembership | undefined) =>
  !!membership && (isOrganizationLecturer(membership) || hasOrganizationPermission({ membership, permission: 'MANAGE_GRADES' }))
