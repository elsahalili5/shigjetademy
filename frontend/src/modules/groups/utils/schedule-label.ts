import type { GroupScheduleEntry, Weekday } from '@shigjetademy/shared/groups'

export const WEEKDAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
} as const satisfies Record<Weekday, string>

const WEEKDAY_SHORT_LABELS = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
} as const satisfies Record<Weekday, string>

/** "Mon 17:00–18:30"; the times are the school's wall-clock times, shown as stored */
export const getScheduleEntryLabel = (entry: GroupScheduleEntry) => `${WEEKDAY_SHORT_LABELS[entry.weekday]} ${entry.start_time}–${entry.end_time}`

/** "Mon 17:00–18:30 · Wed 17:00–18:30", in the order given */
export const getScheduleLabel = (schedule: GroupScheduleEntry[]) => schedule.map(getScheduleEntryLabel).join(' · ')

/** A stable key for an entry: entries on one day never overlap, so the day and start are unique */
export const getScheduleEntryKey = (entry: GroupScheduleEntry) => `${entry.weekday}-${entry.start_time}`
