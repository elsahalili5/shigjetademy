import type { ActivityAction } from '@shigjetademy/shared/activity'

export const ACTIVITY_ACTION_LABELS = {
  ORGANIZATION_SUSPENDED: 'Client suspended',
  ORGANIZATION_REACTIVATED: 'Client reactivated',
  PASSWORD_CHANGED: 'Password changed',
  ACCOUNT_LOCKED: 'Account locked',
} as const satisfies Record<ActivityAction, string>
