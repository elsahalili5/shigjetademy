import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { isOrganizationLecturer, isOrganizationStudent } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner, school admins with Grades, lecturers and students use the page; guardians read grades on their child's page, and other admins don't */
export const isGradesMember = (membership: SessionMembership | undefined) =>
  !!membership && (isOrganizationLecturer(membership) || isOrganizationStudent(membership) || hasOrganizationPermission({ membership, permission: 'MANAGE_GRADES' }))
