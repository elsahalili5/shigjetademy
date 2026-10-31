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
  /** The location's, department's or academic period's name for those entries */
  subject_name: string | null
}
