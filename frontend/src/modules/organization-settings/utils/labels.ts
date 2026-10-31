import type { WeekStart } from '@shigjetademy/shared/organization-settings'

export const WEEK_START_LABELS = {
  MONDAY: 'Monday',
  SUNDAY: 'Sunday',
} as const satisfies Record<WeekStart, string>
