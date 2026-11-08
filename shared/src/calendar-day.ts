// Calendar days are 'YYYY-MM-DD' strings, so they compare correctly as strings.
import type { Weekday } from './groups.ts'

const padded = (value: number) => String(value).padStart(2, '0')

/** Today as a 'YYYY-MM-DD' calendar day, where the code runs */
export const todayDay = () => {
  const now = new Date()
  return `${now.getFullYear()}-${padded(now.getMonth() + 1)}-${padded(now.getDate())}`
}

/** The calendar day as 'YYYY-MM-DD' and the wall-clock time as 'HH:MM' in the time zone, read from one moment so they always agree; en-CA writes dates that way */
export const nowIn = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, clock: `${part('hour')}:${part('minute')}` }
}

/** Today as a 'YYYY-MM-DD' calendar day in the time zone */
export const todayIn = (timeZone: string) => nowIn(timeZone).day

/** Date.getUTCDay's order, which starts on Sunday */
const UTC_WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const satisfies readonly Weekday[]

/** The weekday of a 'YYYY-MM-DD' calendar day, wherever the code runs */
export const getWeekday = (day: string): Weekday => UTC_WEEKDAYS[new Date(`${day}T00:00:00.000Z`).getUTCDay()]
