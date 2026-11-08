// A lecturer's own students, read from the groups they currently teach: no notes, guardians or assignments.
import type { AttendanceStatus } from './attendance.ts'

/** One student in one of the viewer's groups; a student in two groups appears once per group */
export type RosterEntry = {
  student_id: string
  first_name: string
  last_name: string
  /** The email of the login linked to the student's record, or null when they have none */
  email: string | null
  group: { id: string; name: string }
}

/** One attendance mark in the student's history, newest first */
export type StudentAttendanceEntry = {
  date: string
  group: { id: string; name: string }
  start_time: string
  status: AttendanceStatus
}

/** Raw counts per status from marked sessions, and the share of them attended; null while nothing is marked yet */
export type StudentAttendanceSummary = {
  present: number
  tardy: number
  absent: number
  rate: number | null
}

/** One student as this viewer may read them: their shared groups and their attendance in them */
export type StudentRosterDetail = {
  student: { id: string; first_name: string; last_name: string }
  groups: { id: string; name: string }[]
  attendance: StudentAttendanceEntry[]
  summary: StudentAttendanceSummary
}
