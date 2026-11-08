// Reads a group the way the lesson calendar needs it; Attendance and lesson reschedules share it
import type { Prisma } from '@generated/prisma/client.ts'
import { toClock, toDate, toDay } from '@lib/calendar-day.ts'
import { meetingsSelect } from '@modules/groups/group-schedule.ts'
import type { LessonGroup } from './lesson-calendar.ts'

const daysSelect = { start_date: true, end_date: true } as const

/** What the lesson rules and the answers read of a group; registers on record and reschedules only those touching the days asked about */
export const lessonGroupSelectOn = (days: string[]) =>
  ({
    id: true,
    name: true,
    status: true,
    course: { select: { name: true } },
    location: { select: { name: true } },
    academic_year: { select: { ...daysSelect, holidays: { select: daysSelect } } },
    academic_term: { select: daysSelect },
    meetings: meetingsSelect,
    lecturer_assignments: { select: { id: true, lecturer_id: true, ...daysSelect } },
    substitutions: { where: { cancelled_at: null }, select: { lecturer_id: true, ...daysSelect, lecturer: { select: { first_name: true, last_name: true } } } },
    attendance: { where: { date: { in: days.map(toDate) } }, distinct: ['date', 'start_time'], select: { date: true, start_time: true } },
    reschedules: { where: { cancelled_at: null, OR: [{ original_date: { in: days.map(toDate) } }, { new_date: { in: days.map(toDate) } }] }, select: { original_date: true, original_start_time: true, new_date: true, new_start_time: true, new_end_time: true } },
  }) as const satisfies Prisma.GroupSelect

export type StoredLessonGroup = Prisma.GroupGetPayload<{ select: ReturnType<typeof lessonGroupSelectOn> }>

type StoredDays = {
  start_date: Date
  end_date: Date
}

const toDays = ({ start_date, end_date }: StoredDays) => ({ start_date: toDay(start_date), end_date: toDay(end_date) })

/** The group as the pure lesson rules read it */
export const toLessonGroup = (group: StoredLessonGroup): LessonGroup => ({
  period: toDays(group.academic_term ?? group.academic_year),
  holidays: group.academic_year.holidays.map(toDays),
  meetings: group.meetings.map((meeting) => ({ weekday: meeting.weekday, start_time: toClock(meeting.start_time), end_time: toClock(meeting.end_time) })),
  assignments: group.lecturer_assignments.map((row) => ({ id: row.id, lecturer_id: row.lecturer_id, start_date: toDay(row.start_date), end_date: row.end_date && toDay(row.end_date) })),
  substitutions: group.substitutions.map((row) => ({ lecturer_id: row.lecturer_id, lecturer: row.lecturer, ...toDays(row) })),
  registers: group.attendance.map((row) => ({ date: toDay(row.date), start_time: toClock(row.start_time) })),
  reschedules: group.reschedules.map((row) => ({
    original_date: toDay(row.original_date),
    original_start_time: toClock(row.original_start_time),
    new_date: toDay(row.new_date),
    new_start_time: toClock(row.new_start_time),
    new_end_time: toClock(row.new_end_time),
  })),
})
