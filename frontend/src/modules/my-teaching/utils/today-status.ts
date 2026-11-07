import type { MyTeaching } from '@shigjetademy/shared/lecturers'
import { toDayNumber } from './day-number'
import type { OrganizationClock } from './organization-clock'

const DAYS_PER_WEEK = 7

/** What today is for teaching, from academic periods only; class counts wait for a timetable */
export type TodayStatus =
  | { kind: 'WEEKEND' }
  | { kind: 'HOLIDAY'; name: string }
  | { kind: 'TERM'; name: string; week: number }
  | { kind: 'UPCOMING_TERM'; name: string; startDate: string }
  | { kind: 'NONE' }

type GetTodayStatusParams = {
  clock: OrganizationClock
  myTeaching: Pick<MyTeaching, 'academic_year' | 'term' | 'holiday' | 'next_term'>
}

/** The weekend first, then a holiday, the running term with its week (the start day is in week 1), the next term, or nothing */
export const getTodayStatus = ({ clock, myTeaching }: GetTodayStatusParams): TodayStatus => {
  if (!myTeaching.academic_year) return { kind: 'NONE' }
  if (clock.isWeekend) return { kind: 'WEEKEND' }
  if (myTeaching.holiday) return { kind: 'HOLIDAY', name: myTeaching.holiday.name }
  if (myTeaching.term) {
    const daysIn = toDayNumber(clock.day) - toDayNumber(myTeaching.term.start_date)
    return { kind: 'TERM', name: myTeaching.term.name, week: Math.floor(daysIn / DAYS_PER_WEEK) + 1 }
  }
  if (myTeaching.next_term) return { kind: 'UPCOMING_TERM', name: myTeaching.next_term.name, startDate: myTeaching.next_term.start_date }
  return { kind: 'NONE' }
}
