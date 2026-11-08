// How the student and lecturer homes read moved lessons: both slots and the group, never the staff-only reason
import type { Prisma } from '@generated/prisma/client.ts'
import type { RescheduledLesson } from '@shigjetademy/shared/groups'
import { toClock, toDay } from '@lib/calendar-day.ts'

export const rescheduledLessonSelect = {
  id: true,
  original_date: true,
  original_start_time: true,
  new_date: true,
  new_start_time: true,
  new_end_time: true,
  group: { select: { id: true, name: true, course: { select: { name: true } } } },
} as const satisfies Prisma.LessonRescheduleSelect

/** Not cancelled, and moved to the day or later */
export const upcomingReschedules = (today: Date) => ({ cancelled_at: null, new_date: { gte: today } }) satisfies Prisma.LessonRescheduleWhereInput

type DayRange = {
  start: Date
  end: Date
}

/** Upcoming moves onto a day inside the range, like a holiday's */
export const upcomingMovesInside = ({ today, range }: { today: Date; range: DayRange }) =>
  ({ cancelled_at: null, AND: [{ new_date: { gte: today } }, { new_date: { gte: range.start, lte: range.end } }] }) satisfies Prisma.LessonRescheduleWhereInput

/** Upcoming moves onto a day outside the range, like a term's or year's new dates */
export const upcomingMovesOutside = ({ today, range }: { today: Date; range: DayRange }) =>
  ({ cancelled_at: null, AND: [{ new_date: { gte: today } }, { OR: [{ new_date: { lt: range.start } }, { new_date: { gt: range.end } }] }] }) satisfies Prisma.LessonRescheduleWhereInput

/** By the day and time they moved to */
export const byNewSlot = [{ new_date: 'asc' }, { new_start_time: 'asc' }, { created_at: 'asc' }] as const satisfies Prisma.LessonRescheduleOrderByWithRelationInput[]

type StoredRescheduledLesson = Prisma.LessonRescheduleGetPayload<{ select: typeof rescheduledLessonSelect }>

export const toRescheduledLesson = (reschedule: StoredRescheduledLesson): RescheduledLesson => ({
  id: reschedule.id,
  group: { id: reschedule.group.id, name: reschedule.group.name, course: reschedule.group.course.name },
  original_date: toDay(reschedule.original_date),
  original_start_time: toClock(reschedule.original_start_time),
  new_date: toDay(reschedule.new_date),
  new_start_time: toClock(reschedule.new_start_time),
  new_end_time: toClock(reschedule.new_end_time),
})
