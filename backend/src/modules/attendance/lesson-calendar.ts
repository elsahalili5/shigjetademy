// Which lesson sessions a group has on a day, their edit windows and who takes their registers, worked out from data that already exists:
// the schedule, the term or school year, holidays, reschedules, registers on record, lecturer assignments and substitutions. This is the one place that answers it.
// A session is a group on a day at a start time. Days are 'YYYY-MM-DD' and times 'HH:MM', so they compare as strings.
import type { AttendanceWindow } from '@shigjetademy/shared/attendance'
import { getWeekday } from '@shigjetademy/shared/calendar-day'
import type { Weekday } from '@shigjetademy/shared/groups'
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
  /** Sessions with marks on record, at least for the days asked about, so a register stays reachable after the schedule changes */
  registers: { date: string; start_time: string }[]
  /** Reschedules that aren't cancelled */
  reschedules: Reschedule[]
}

/** A regular session moved to another day and time */
export type Reschedule = {
  original_date: string
  original_start_time: string
  new_date: string
  new_start_time: string
  new_end_time: string
}

type IsWithinParams = {
  range: DayRange
  day: string
}

const isWithin = ({ range, day }: IsWithinParams) => range.start_date <= day && day <= range.end_date

type GroupOnDayParams = {
  group: LessonGroup
  day: string
}

/** One lesson session of a group on a day */
export type Session = {
  start_time: string
  end_time: string
  /** The regular session it was moved from, or null for one where the schedule puts it */
  rescheduled_from: { date: string; start_time: string } | null
}

/** A stretch of a day, like a session or a new slot for one */
type Slot = Pick<Session, 'start_time' | 'end_time'>

const byStart = (a: Slot, b: Slot) => a.start_time.localeCompare(b.start_time)

/** Why the weekly schedule doesn't run on the day, if so: outside the group's term or year, or on a holiday */
export const getOffScheduleReason = ({ group, day }: GroupOnDayParams) => {
  if (!isWithin({ range: group.period, day })) return 'OUTSIDE_PERIOD'
  if (group.holidays.some((range) => isWithin({ range, day }))) return 'HOLIDAY'
  return null
}

/** The sessions the weekly schedule puts on the day, before any reschedule */
export const getScheduledSessions = ({ group, day }: GroupOnDayParams): Session[] => {
  if (getOffScheduleReason({ group, day })) return []
  const weekday = getWeekday(day)
  return group.meetings
    .filter((meeting) => meeting.weekday === weekday)
    .map(({ start_time, end_time }) => ({ start_time, end_time, rescheduled_from: null }))
    .toSorted(byStart)
}

type FindRescheduleParams = GroupOnDayParams & {
  startTime: string
}

/** The reschedule moving the group's session that day at that start elsewhere, if any */
export const findRescheduleOf = ({ group, day, startTime }: FindRescheduleParams) => group.reschedules.find((reschedule) => reschedule.original_date === day && reschedule.original_start_time === startTime) ?? null

/** The session the weekly schedule puts on the day at that start, before any reschedule, if any */
export const findScheduledSession = ({ group, day, startTime }: FindRescheduleParams) => getScheduledSessions({ group, day }).find((session) => session.start_time === startTime) ?? null

/** The scheduled sessions on the day that weren't moved away */
const getStayingSessions = ({ group, day }: GroupOnDayParams) => getScheduledSessions({ group, day }).filter((session) => !findRescheduleOf({ group, day, startTime: session.start_time }))

const toMovedInSession = (reschedule: Reschedule): Session => ({
  start_time: reschedule.new_start_time,
  end_time: reschedule.new_end_time,
  rescheduled_from: { date: reschedule.original_date, start_time: reschedule.original_start_time },
})

/** The first session per start time, so no two share a register */
const firstPerStart = (sessions: Session[]) => [...new Map(sessions.toReversed().map((session) => [session.start_time, session])).values()]

/**
 * The group's sessions on the day, earliest first: the scheduled ones not moved away, the ones moved in, and any register on record that neither has,
 * like one the schedule no longer has. Such a register has no end time left, so it ends as it starts.
 * A start time is one session: should a schedule session and a moved-in one ever share it, the moved-in one wins.
 */
export const getSessions = ({ group, day }: GroupOnDayParams): Session[] => {
  const movedIn = group.reschedules.filter((reschedule) => reschedule.new_date === day).map(toMovedInSession)
  const recorded = group.registers.filter((register) => register.date === day).map((register) => ({ start_time: register.start_time, end_time: register.start_time, rescheduled_from: null }))
  return firstPerStart([...movedIn, ...getStayingSessions({ group, day }), ...recorded]).toSorted(byStart)
}

type FindOverlapParams = {
  sessions: Session[]
  slot: Slot
}

/** The first session sharing some minutes with the slot; one ending as the other starts is fine */
export const findOverlap = ({ sessions, slot }: FindOverlapParams) => sessions.find((session) => session.start_time < slot.end_time && slot.start_time < session.end_time) ?? null

type FindMovedInClashParams = {
  group: LessonGroup
  /** The organization's today; moves to earlier days are history */
  from: string
}

/**
 * The first move to today or later that the group's schedule, term, year or holidays now clash with: its day is off the schedule's term or year,
 * a holiday, or a scheduled session overlaps it. Edits to those must keep moved lessons clear of them.
 */
export const findMovedInClash = ({ group, from }: FindMovedInClashParams) => {
  for (const reschedule of group.reschedules.filter((item) => item.new_date >= from).toSorted((a, b) => a.new_date.localeCompare(b.new_date) || a.new_start_time.localeCompare(b.new_start_time))) {
    const day = reschedule.new_date
    const offSchedule = getOffScheduleReason({ group, day })
    if (offSchedule) return { reschedule, kind: offSchedule, session: null } as const
    const session = findOverlap({ sessions: getStayingSessions({ group, day }), slot: toMovedInSession(reschedule) })
    if (session) return { reschedule, kind: 'OVERLAP', session } as const
  }
  return null
}

type GetSessionParams = GroupOnDayParams & {
  startTime: string
}

/** The session starting at that time on the day, or null when the group has none then */
export const getSession = ({ startTime, ...params }: GetSessionParams) => getSessions(params).find((session) => session.start_time === startTime) ?? null

/** The permanent lecturer on the day, whether or not someone covers it */
export const getPermanentLecturerId = ({ group, day }: GroupOnDayParams) => getLecturerIdOn({ rows: group.assignments, day })

/** The substitution covering the day, if any */
export const getSubstitution = ({ group, day }: GroupOnDayParams) => group.substitutions.find((substitution) => isWithin({ range: substitution, day })) ?? null

/** Who teaches the group on the day: the substitute covering it, otherwise the permanent lecturer */
export const getTeachingLecturerId = ({ group, day }: GroupOnDayParams) => getSubstitution({ group, day })?.lecturer_id ?? getPermanentLecturerId({ group, day })

type GetRegisterWindowParams = {
  day: string
  session: Session
  /** The organization's day and wall-clock time right now */
  now: { day: string; clock: string }
}

/** Before the session starts, from its start until its end, or from that end on */
export const getRegisterWindow = ({ day, session, now }: GetRegisterWindowParams): AttendanceWindow => {
  const moment = `${now.day} ${now.clock}`
  if (moment < `${day} ${session.start_time}`) return 'UPCOMING'
  if (moment < `${day} ${session.end_time}`) return 'OPEN'
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

/** Nobody marks an archived group or a session that hasn't started; a lecturer only while it runs, a manager also after it locks */
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
