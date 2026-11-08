import type { AttendanceSession } from '@shigjetademy/shared/attendance'

/** "Group A · Mathematics · 17:00–18:30" */
export const getAttendanceSessionLabel = (session: AttendanceSession) => `${session.name} · ${session.course} · ${session.start_time}–${session.end_time}`

/** One session among the day's: a group has one session per start time */
export const getAttendanceSessionKey = (session: Pick<AttendanceSession, 'group_id' | 'start_time'>) => `${session.group_id}/${session.start_time}`
