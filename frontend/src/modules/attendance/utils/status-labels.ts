import type { AttendanceStatus } from '@shigjetademy/shared/attendance'

export const ATTENDANCE_STATUS_LABELS = {
  PRESENT: 'Present',
  TARDY: 'Tardy',
  ABSENT: 'Absent',
} as const satisfies Record<AttendanceStatus, string>

export const NOT_MARKED_LABEL = 'Not marked'

/** The `chip--*` class for each status, so it reads the same wherever a mark is shown outside the marking buttons */
export const ATTENDANCE_STATUS_CHIPS = {
  PRESENT: 'chip--green',
  TARDY: 'chip--kraft',
  ABSENT: 'chip--coral',
} as const satisfies Record<AttendanceStatus, string>
