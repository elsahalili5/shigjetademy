// One student's attendance history and summary over a set of groups, shared by the roster's student page and a guardian's page for their child
import { ATTENDANCE_STATUSES } from '@shigjetademy/shared/attendance'
import type { AttendanceStatus } from '@shigjetademy/shared/attendance'
import type { StudentAttendanceEntry, StudentAttendanceSummary } from '@shigjetademy/shared/student-roster'
import { toClock, toDay } from '@lib/calendar-day.ts'
import { prisma } from '@lib/prisma.ts'

type StoredAttendanceRecord = {
  date: Date
  start_time: Date
  status: AttendanceStatus
  group: { id: string; name: string }
}

const toAttendanceEntry = (record: StoredAttendanceRecord): StudentAttendanceEntry => ({ date: toDay(record.date), start_time: toClock(record.start_time), status: record.status, group: record.group })

/** Marked sessions only; present and tardy both count as attended, so the rate never blames a late arrival as absence */
const toSummary = (records: StoredAttendanceRecord[]): StudentAttendanceSummary => {
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((status) => [status, records.filter((record) => record.status === status).length])) as Record<AttendanceStatus, number>
  const total = records.length
  return { present: counts.PRESENT, tardy: counts.TARDY, absent: counts.ABSENT, rate: total === 0 ? null : Math.round(((counts.PRESENT + counts.TARDY) / total) * 100) }
}

type GetStudentAttendanceParams = {
  studentId: string
  /** Only marks in these groups count; the caller has already decided which groups the viewer may read */
  groupIds: string[]
}

/** The student's marks in the groups, newest first, with their summary */
export const getStudentAttendance = async ({ studentId, groupIds }: GetStudentAttendanceParams) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { student_id: studentId, group_id: { in: groupIds } },
    orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
    select: { date: true, start_time: true, status: true, group: { select: { id: true, name: true } } },
  })
  return { attendance: records.map(toAttendanceEntry), summary: toSummary(records) }
}
