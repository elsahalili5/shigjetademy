import type { AttendanceGroup } from '@shigjetademy/shared/attendance'

/** "Group A · Mathematics · 17:00–18:30" */
export const getAttendanceGroupLabel = (group: AttendanceGroup) => `${group.name} · ${group.course} · ${group.opens_at}–${group.locks_at}`
