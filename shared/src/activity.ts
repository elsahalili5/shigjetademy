export const ACTIVITY_ACTIONS = [
  'ORGANIZATION_SUSPENDED',
  'ORGANIZATION_REACTIVATED',
  'PASSWORD_CHANGED',
  'ACCOUNT_LOCKED',
  'MEMBER_UPDATED',
  'MEMBER_REMOVED',
  'ORGANIZATION_PROFILE_UPDATED',
  'LOCATION_CREATED',
  'LOCATION_UPDATED',
  'LOCATION_REMOVED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'ROOM_REMOVED',
  'DEPARTMENT_CREATED',
  'DEPARTMENT_UPDATED',
  'DEPARTMENT_REMOVED',
  'ACADEMIC_YEAR_CREATED',
  'ACADEMIC_YEAR_UPDATED',
  'ACADEMIC_YEAR_REMOVED',
  'ACADEMIC_TERM_CREATED',
  'ACADEMIC_TERM_UPDATED',
  'ACADEMIC_TERM_REMOVED',
  'ACADEMIC_HOLIDAY_CREATED',
  'ACADEMIC_HOLIDAY_UPDATED',
  'ACADEMIC_HOLIDAY_REMOVED',
  'ORGANIZATION_SETTINGS_UPDATED',
  'OWNERSHIP_TRANSFERRED',
  'ORGANIZATION_DEACTIVATED_BY_OWNER',
  'ORGANIZATION_REACTIVATED_BY_OWNER',
  'STUDENT_ADDED',
  'STUDENT_UPDATED',
  'STUDENT_ARCHIVED',
  'STUDENT_RESTORED',
  'LECTURER_ADDED',
  'LECTURER_UPDATED',
  'LECTURER_ARCHIVED',
  'LECTURER_RESTORED',
  'COURSE_ADDED',
  'COURSE_UPDATED',
  'COURSE_ARCHIVED',
  'COURSE_RESTORED',
  'GROUP_ADDED',
  'GROUP_UPDATED',
  'GROUP_ARCHIVED',
  'GROUP_RESTORED',
  'GROUP_SUBSTITUTION_ADDED',
  'GROUP_SUBSTITUTION_UPDATED',
  'GROUP_SUBSTITUTION_CANCELLED',
  'GROUP_STUDENT_ENROLLED',
  'GROUP_STUDENT_WITHDRAWN',
  'GROUP_STUDENT_MOVED',
  'ATTENDANCE_CORRECTED',
  'LESSON_RESCHEDULED',
  'LESSON_RESCHEDULE_CANCELLED',
  'INVITATION_SENT',
  'INVITATION_RESENT',
  'INVITATION_REVOKED',
  'INVITATION_ACCEPTED',
  'PLATFORM_SETTINGS_UPDATED',
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export const ACTIVITY_PAGE_SIZE = 50

export const ACTIVITY_PAGE_SIZE_MAX = 100

export type ActivityUser = {
  id: string
  first_name: string
  last_name: string
  email: string
}

/** One log entry as JSON; actor is null for system events like a lockout */
export type ActivityEntry = {
  id: string
  action: ActivityAction
  created_at: string
  actor: ActivityUser | null
  organization: { id: string; name: string } | null
  target_user: ActivityUser | null
  /** The location's, department's, academic period's, student's, lecturer's, course's or group's name, or the invited email, for those entries; for a student's group change, like "Arta Gashi from Group A to Group B"; for an attendance correction, like "Arta Gashi in Group A on 2026-11-07" */
  subject_name: string | null
}
