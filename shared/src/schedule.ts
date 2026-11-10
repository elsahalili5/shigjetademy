// What the Timetable page reads: one entry per group meeting, with its room, its lecturer on today, and whether either clashes with another meeting.
import type { Weekday } from './groups'

export type ScheduleClash = {
  /** Another meeting shares this room at an overlapping time on the same day */
  room: boolean
  /** Another meeting shares this teacher at an overlapping time on the same day */
  teacher: boolean
}

export type WeeklyScheduleEntry = {
  group: { id: string; name: string }
  weekday: Weekday
  start_time: string
  end_time: string
  /** Null when the group has no room assigned */
  room: { id: string; name: string } | null
  /** The group's current lecturer, substitution-aware; null when it has none */
  teacher: { id: string; first_name: string; last_name: string } | null
  clash: ScheduleClash
}
