// The attendance page and the endpoints that take registers share these schemas and shapes.
// A register belongs to one lesson session: a group on a day at a start time, never a lesson topic. A group meeting twice a day has two.
import { z } from 'zod'
import type { GroupStatus } from './groups.ts'

export const ATTENDANCE_STATUSES = ['PRESENT', 'TARDY', 'ABSENT'] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

const lessonDateSchema = z.iso.date('Choose a date.')

/** The day whose lessons to list */
export const attendanceGroupsQuerySchema = z.object({
  date: lessonDateSchema,
})

export type AttendanceGroupsQuery = z.infer<typeof attendanceGroupsQuerySchema>

/** One student's mark; clearing a mark isn't offered */
export const attendanceMarkSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES, 'Choose present, tardy or absent.'),
})

export type AttendanceMarkInput = z.infer<typeof attendanceMarkSchema>

/** The regular session a lesson was moved from: its day and start */
export type RescheduledFrom = {
  date: string
  start_time: string
}

/** One lesson session on the chosen day, with its start and end as 'HH:MM'; a group meeting twice that day has two */
export type AttendanceSession = {
  group_id: string
  name: string
  course: string
  location: string | null
  start_time: string
  end_time: string
  /** Set for a session moved here from another date or time */
  rescheduled_from: RescheduledFrom | null
}

/** Where the register stands in the organization's time zone: before the session starts, from its start until its end, or from its end on */
export type AttendanceWindow = 'UPCOMING' | 'OPEN' | 'LOCKED'

/** A student on the register, with their mark or null while unmarked; only names, never notes or dates of birth */
export type AttendanceStudent = {
  id: string
  first_name: string
  last_name: string
  is_archived: boolean
  status: AttendanceStatus | null
}

/** One past session with at least one saved mark, for the history list: who, when, and how much of it is marked */
export type AttendanceHistoryEntry = {
  group_id: string
  name: string
  course: string
  date: string
  start_time: string
  end_time: string
  marked: number
  total: number
}

/** The register of one lesson session */
export type AttendanceRegister = {
  group: { id: string; name: string; course: string; status: GroupStatus }
  date: string
  start_time: string
  end_time: string
  /** Set for a session moved here from another date or time */
  rescheduled_from: RescheduledFrom | null
  window: AttendanceWindow
  /** Whether this user may mark it now */
  can_edit: boolean
  /** The lecturer covering this day, when a substitute takes the register instead of the permanent lecturer */
  substitute: { first_name: string; last_name: string } | null
  students: AttendanceStudent[]
}
