import type { AttendanceStatus } from '@shigjetademy/shared/attendance'

export const ATTENDANCE_STATUS_LABELS = {
  PRESENT: 'Present',
  TARDY: 'Tardy',
  ABSENT: 'Absent',
} as const satisfies Record<AttendanceStatus, string>

export const NOT_MARKED_LABEL = 'Not marked'
