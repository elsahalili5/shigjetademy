// Whether a day is a lesson for a group, its edit window and who takes its register, worked out from data that already exists:
// the schedule, the term or school year, holidays, lecturer assignments and substitutions. Days are 'YYYY-MM-DD' and times 'HH:MM', so they compare as strings.
import type { AttendanceWindow } from '@shigjetademy/shared/attendance'
import type { Weekday } from '@shigjetademy/shared/groups'
import { toDate } from '@lib/calendar-day.ts'
import { getLecturerIdOn } from '@modules/groups/lecturer-timeline.ts'
import type { TimelineRow } from '@modules/groups/lecturer-timeline.ts'

type DayRange = {
  start_date: string
  end_date: string
}

type Meeting = {
  weekday: Weekday
  start_time: string
  end_time: string
}

type LecturerName = {
  first_name: string
  last_name: string
}

/** What the lesson rules read of a group */
export type LessonGroup = {
  /** The group's term, or its school year without one */
  period: DayRange
  /** Every holiday of the group's school year */
  holidays: DayRange[]
  meetings: Meeting[]
  /** The permanent lecturer rows */
  assignments: (TimelineRow & { id: string })[]
  /** Substitutions that aren't cancelled, with the substitute's name */
  substitutions: (DayRange & { lecturer_id: string; lecturer: LecturerName })[]
}

/** Date.getUTCDay's order, which starts on Sunday */
const UTC_WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const satisfies readonly Weekday[]

export const getWeekday = (day: string): Weekday => UTC_WEEKDAYS[toDate(day).getUTCDay()]

type IsWithinParams = {
  range: DayRange
  day: string
}

const isWithin = ({ range, day }: IsWithinParams) => range.start_date <= day && day <= range.end_date

type GroupOnDayParams = {
  group: LessonGroup
  day: string
}

/** The day's lesson as its first start and last end, or null when the group doesn't meet: off its schedule, outside its term or year, or on a holiday */
export const getLesson = ({ group, day }: GroupOnDayParams) => {
  if (!isWithin({ range: group.period, day }) || group.holidays.some((range) => isWithin({ range, day }))) return null
  const weekday = getWeekday(day)
  const meetings = group.meetings.filter((meeting) => meeting.weekday === weekday)
  if (meetings.length === 0) return null
  return {
    opens_at: meetings.map((meeting) => meeting.start_time).toSorted()[0],
    locks_at: meetings.map((meeting) => meeting.end_time).toSorted().at(-1) ?? '',
  }
}

export type Lesson = NonNullable<ReturnType<typeof getLesson>>

/** The permanent lecturer on the day, whether or not someone covers it */
export const getPermanentLecturerId = ({ group, day }: GroupOnDayParams) => getLecturerIdOn({ rows: group.assignments, day })

/** The substitution covering the day, if any */
export const getSubstitution = ({ group, day }: GroupOnDayParams) => group.substitutions.find((substitution) => isWithin({ range: substitution, day })) ?? null

/** Who teaches the group on the day: the substitute covering it, otherwise the permanent lecturer */
export const getTeachingLecturerId = ({ group, day }: GroupOnDayParams) => getSubstitution({ group, day })?.lecturer_id ?? getPermanentLecturerId({ group, day })

type GetRegisterWindowParams = {
  day: string
  lesson: Lesson
  /** The organization's day and wall-clock time right now */
  now: { day: string; clock: string }
}

/** Before the lesson's first start, from it until its last end, or from that end on */
export const getRegisterWindow = ({ day, lesson, now }: GetRegisterWindowParams): AttendanceWindow => {
  const moment = `${now.day} ${now.clock}`
  if (moment < `${day} ${lesson.opens_at}`) return 'UPCOMING'
  if (moment < `${day} ${lesson.locks_at}`) return 'OPEN'
  return 'LOCKED'
}

/**
 * What the user may do with the register: a manager takes or corrects any; the lecturer teaching that day takes it;
 * the permanent lecturer of a covered day only reads it
 */
export type RegisterAccess = 'MANAGER' | 'TEACHER' | 'READER'

type CanEditRegisterParams = {
  access: RegisterAccess
  window: AttendanceWindow
  isArchived: boolean
}

/** Nobody marks an archived group or a lesson that hasn't started; a lecturer only while it runs, a manager also after it locks */
export const canEditRegister = ({ access, window, isArchived }: CanEditRegisterParams) => {
  if (isArchived || window === 'UPCOMING') return false
  switch (access) {
    case 'MANAGER':
      return true
    case 'TEACHER':
      return window === 'OPEN'
    case 'READER':
      return false
    default: {
      const unhandled: never = access
      throw new Error(`Unhandled register access: ${String(unhandled)}`)
    }
  }
}
