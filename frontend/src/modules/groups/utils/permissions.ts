import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { SessionMembership } from '#/modules/auth/utils/session-user'

import { isCoursesManager } from '#/modules/courses/utils/permissions'

/** The owner always plans the timetable; a school admin only with the permission in this organization */
export const isSchedulesManager = (membership: SessionMembership | undefined) => !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_SCHEDULES' })

/** Who opens Groups: course managers change them, timetable admins only read them and move their lessons */
export const isGroupsReader = (membership: SessionMembership | undefined) => isCoursesManager(membership) || isSchedulesManager(membership)
