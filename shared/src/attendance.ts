// The attendance page and the endpoints that take registers share these schemas and shapes.
// A register is one group on one lesson day, never a lesson topic.
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

/** A group with a lesson on the chosen day, with its first start and last end that day as 'HH:MM' */
export type AttendanceGroup = {
  id: string
  name: string
  course: string
  location: string | null
  opens_at: string
  locks_at: string
}

/**
 * Where the register stands in the organization's time zone: before the lesson's first start, from its first start until its last end,
 * or from its last end on
 */
export type AttendanceWindow = 'UPCOMING' | 'OPEN' | 'LOCKED'

/** A student on the register, with their mark or null while unmarked; only names, never notes or dates of birth */
export type AttendanceStudent = {
  id: string
  first_name: string
  last_name: string
  is_archived: boolean
  status: AttendanceStatus | null
}

/** One group's register on one lesson day */
export type AttendanceRegister = {
  group: { id: string; name: string; course: string; status: GroupStatus }
  date: string
  opens_at: string
  locks_at: string
  window: AttendanceWindow
  /** Whether this user may mark it now */
  can_edit: boolean
  /** The lecturer covering this day, when a substitute takes the register instead of the permanent lecturer */
  substitute: { first_name: string; last_name: string } | null
  students: AttendanceStudent[]
}
