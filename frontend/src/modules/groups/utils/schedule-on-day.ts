import { getWeekday } from '@shigjetademy/shared/calendar-day'
import type { GroupScheduleEntry } from '@shigjetademy/shared/groups'

type GetScheduleOnDayParams = {
  schedule: GroupScheduleEntry[]
  /** 'YYYY-MM-DD', or '' for none */
  day: string
}

/** The weekly entries falling on the day's weekday, to pick a lesson from; the server decides whether the day is a lesson */
export const getScheduleOnDay = ({ schedule, day }: GetScheduleOnDayParams) => {
  if (!day) return []
  const weekday = getWeekday(day)
  return schedule.filter((entry) => entry.weekday === weekday)
}
