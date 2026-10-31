import type { ActivityAction } from '@shigjetademy/shared/activity'

export const ACTIVITY_ACTION_LABELS = {
  ORGANIZATION_SUSPENDED: 'Client suspended',
  ORGANIZATION_REACTIVATED: 'Client reactivated',
  PASSWORD_CHANGED: 'Password changed',
  ACCOUNT_LOCKED: 'Account locked',
  MEMBER_UPDATED: 'Member updated',
  MEMBER_REMOVED: 'Member removed',
  ORGANIZATION_PROFILE_UPDATED: 'Profile updated',
  LOCATION_CREATED: 'Location added',
  LOCATION_UPDATED: 'Location changed',
  LOCATION_REMOVED: 'Location removed',
  DEPARTMENT_CREATED: 'Department added',
  DEPARTMENT_UPDATED: 'Department changed',
  DEPARTMENT_REMOVED: 'Department removed',
} as const satisfies Record<ActivityAction, string>
