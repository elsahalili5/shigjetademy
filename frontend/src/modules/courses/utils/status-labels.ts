import type { CourseStatus } from '@shigjetademy/shared/courses'

export const COURSE_STATUS_LABELS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
} as const satisfies Record<CourseStatus, string>
