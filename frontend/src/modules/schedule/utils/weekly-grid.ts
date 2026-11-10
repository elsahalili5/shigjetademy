import { WEEKDAYS } from '@shigjetademy/shared/groups'
import type { Weekday } from '@shigjetademy/shared/groups'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'

type GetWeekdaysInOrderParams = {
  weekStart: WeekStart
}

/** The seven weekdays starting from the organization's first day of the week */
export const getWeekdaysInOrder = ({ weekStart }: GetWeekdaysInOrderParams): Weekday[] => {
  const firstIndex = WEEKDAYS.indexOf(weekStart)
  return [...WEEKDAYS.slice(firstIndex), ...WEEKDAYS.slice(0, firstIndex)]
}

type GetDayEntriesParams = {
  schedule: WeeklyScheduleEntry[]
  weekday: Weekday
}

/** One day's entries, earliest first */
export const getDayEntries = ({ schedule, weekday }: GetDayEntriesParams) =>
  schedule.filter((entry) => entry.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time))

/** A stable key for an entry: a group's meetings on one day never overlap, so the group and start are unique */
export const getWeeklyEntryKey = (entry: WeeklyScheduleEntry) => `${entry.group.id}-${entry.weekday}-${entry.start_time}`
