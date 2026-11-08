import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

/** The owner always plans lessons; a school admin only with MANAGE_COURSES in this organization */
export const isLessonPlanManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' })

/** Lesson plan managers, and lecturers for the sessions they teach, which the server checks per session */
export const isLessonPlanWriter = (membership: SessionMembership | undefined) => isLessonPlanManager(membership) || isOrganizationLecturer(membership)
