import type { HandInStatus } from '@shigjetademy/shared/assignments'

export const HAND_IN_STATUS_LABELS = {
  NOT_HANDED_IN: 'Not handed in',
  HANDED_IN: 'Handed in',
  LATE: 'Late',
  MARKED: 'Marked',
} as const satisfies Record<HandInStatus, string>
