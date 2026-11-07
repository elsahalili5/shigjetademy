import { toDay } from './calendar-day.ts'

/** The fields a home page shows of a school year or term */
export const periodSelect = { name: true, start_date: true, end_date: true } as const

type StoredPeriod = { name: string; start_date: Date; end_date: Date }

export const toPeriodJson = ({ name, start_date, end_date }: StoredPeriod) => ({ name, start_date: toDay(start_date), end_date: toDay(end_date) })

/** Today as a 'YYYY-MM-DD' calendar day in the time zone; en-CA writes dates that way */
export const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
