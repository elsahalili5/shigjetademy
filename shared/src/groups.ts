// The group forms and the endpoints that store groups share these schemas.
import { z } from 'zod'
import { nameSchema } from './auth.ts'
import { optionalText } from './organization.ts'
import type { CourseOption } from './courses.ts'
import type { Lecturer, LecturerStatus } from './lecturers.ts'
import type { Student, StudentStatus } from './students.ts'
import type { WeekStart } from './organization-settings.ts'

export const GROUP_STATUSES = ['ACTIVE', 'ARCHIVED'] as const

export type GroupStatus = (typeof GROUP_STATUSES)[number]

const CAPACITY_MAX = 1000

export const GROUP_PAGE_SIZE = 25

const GROUP_PAGE_SIZE_MAX = 100

const SUBSTITUTION_NOTE_MAX = 500

export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const

export type Weekday = (typeof WEEKDAYS)[number]

const SCHEDULE_ENTRIES_MAX = 30

/** A wall-clock time like "17:00", with no time zone */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const timeSchema = (message: string) => z.string().regex(TIME_PATTERN, message)

type TimeRange = {
  start: string
  end: string
}

/** End after start, once both are times; a malformed one already has its own message */
const isEndAfterStart = ({ start, end }: TimeRange) => !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || end > start

/** Where and how a start and end pair is refused: under its end field */
const endAfterStartIssue = (endField: string) => ({ path: [endField], message: 'The end time must be after the start time.' })

/** One weekly meeting, like Monday 17:00 to 18:30; it runs for the group's term, or its whole school year without one */
const scheduleEntrySchema = z
  .object({
    weekday: z.enum(WEEKDAYS, 'Choose a day.'),
    start_time: timeSchema('Enter the start time.'),
    end_time: timeSchema('Enter the end time.'),
  })
  .refine(({ start_time, end_time }) => isEndAfterStart({ start: start_time, end: end_time }), endAfterStartIssue('end_time'))

export type GroupScheduleEntry = z.infer<typeof scheduleEntrySchema>

type OverlapParams = {
  entry: GroupScheduleEntry
  other: GroupScheduleEntry
}

/** Same day and sharing some minutes; one ending as the other starts is fine. "HH:MM" times compare correctly as strings. */
const isOverlapping = ({ entry, other }: OverlapParams) => entry.weekday === other.weekday && entry.start_time < other.end_time && other.start_time < entry.end_time

/** Entries on one day can't overlap; the later one of a pair is marked */
const scheduleSchema = z
  .array(scheduleEntrySchema)
  .max(SCHEDULE_ENTRIES_MAX, `Keep it to ${SCHEDULE_ENTRIES_MAX} days and times.`)
  .superRefine((entries, context) => {
    entries.forEach((entry, index) => {
      if (entries.slice(0, index).some((other) => isOverlapping({ entry, other }))) {
        context.addIssue({ code: 'custom', path: [index, 'start_time'], message: 'This overlaps another time on the same day.' })
      }
    })
  })

export const SCHEDULE_REQUIRED_MESSAGE = 'Add at least one day and time.'

/** An edit of a group. The location stands in for a room. An empty schedule is only kept by a group that never had one; the service checks that. */
export const groupSchema = z.object({
  course_id: z.uuid('Choose a course.'),
  name: nameSchema('Enter the group name.'),
  academic_year_id: z.uuid('Choose a school year.'),
  academic_term_id: z.uuid('Choose a term.').nullable(),
  location_id: z.uuid('Choose a location.').nullable(),
  capacity: z.number('Enter a whole number.').int('Enter a whole number.').min(1, 'Enter at least 1 seat.').max(CAPACITY_MAX, `Keep it to ${CAPACITY_MAX} seats.`).nullable(),
  /** The permanent lecturer; null for none */
  lecturer_id: z.uuid('Choose a lecturer.').nullable(),
  /** The day a change of lecturer starts, on an edit; null means no change, whatever lecturer_id says. A new group's lecturer starts today. */
  lecturer_effective_from: z.iso.date('Enter the date the change starts.').nullable(),
  /** Every weekly meeting; an edit replaces them all */
  schedule: scheduleSchema,
})

export type GroupInput = z.infer<typeof groupSchema>

/** A new group, which needs at least one day and time */
export const newGroupSchema = groupSchema.extend({ schedule: scheduleSchema.min(1, SCHEDULE_REQUIRED_MESSAGE) })

type SortScheduleParams = {
  schedule: GroupScheduleEntry[]
  weekStart: WeekStart
}

/** The entries in the organization's week, from its first day, then by start time */
export const sortSchedule = ({ schedule, weekStart }: SortScheduleParams) => {
  const firstDay = WEEKDAYS.indexOf(weekStart)
  const dayInWeek = (weekday: Weekday) => (WEEKDAYS.indexOf(weekday) - firstDay + WEEKDAYS.length) % WEEKDAYS.length
  return schedule.toSorted((a, b) => dayInWeek(a.weekday) - dayInWeek(b.weekday) || a.start_time.localeCompare(b.start_time))
}

/** Someone covering a group; one day when the dates are equal. The note comes in as '' when left empty. */
export const groupSubstitutionSchema = z
  .object({
    lecturer_id: z.uuid('Choose a lecturer.'),
    start_date: z.iso.date('Enter the start date.'),
    end_date: z.iso.date('Enter the end date.'),
    note: optionalText(SUBSTITUTION_NOTE_MAX),
  })
  .refine(({ start_date, end_date }) => end_date >= start_date, { path: ['end_date'], message: 'The end date can’t be before the start date.' })

export type GroupSubstitutionInput = z.infer<typeof groupSubstitutionSchema>

/** A student joining a group */
export const groupEnrolmentSchema = z.object({
  student_id: z.uuid('Choose a student.'),
})

export type GroupEnrolmentInput = z.infer<typeof groupEnrolmentSchema>

/** The group a student moves to; any active group of the organization, of any course */
export const groupMoveSchema = z.object({
  group_id: z.uuid('Choose a group.'),
})

export type GroupMoveInput = z.infer<typeof groupMoveSchema>

const RESCHEDULE_REASON_MAX = 500

/**
 * Moves one regular session of a group to a new date and time. The original is named by its day and start;
 * the reason comes in as '' when left empty and is for staff only.
 */
export const lessonRescheduleSchema = z
  .object({
    original_date: z.iso.date('Choose the lesson to move.'),
    original_start_time: timeSchema('Choose the lesson to move.'),
    new_date: z.iso.date('Enter the new date.'),
    new_start_time: timeSchema('Enter the start time.'),
    new_end_time: timeSchema('Enter the end time.'),
    reason: optionalText(RESCHEDULE_REASON_MAX),
  })
  .refine(({ new_start_time, new_end_time }) => isEndAfterStart({ start: new_start_time, end: new_end_time }), endAfterStartIssue('new_end_time'))

export type LessonRescheduleInput = z.infer<typeof lessonRescheduleSchema>

export const listGroupsQuerySchema = z.object({
  status: z.enum(GROUP_STATUSES, 'Unknown status').default('ACTIVE'),
  course_id: z.uuid('Unknown course').optional(),
  academic_year_id: z.uuid('Unknown school year').optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(GROUP_PAGE_SIZE_MAX).default(GROUP_PAGE_SIZE),
})

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>

/** A record a group points to, by id and name */
type GroupRelation = {
  id: string
  name: string
}

/** A lecturer as the groups pages name them */
export type GroupLecturer = Pick<Lecturer, 'id' | 'first_name' | 'last_name'> & {
  status: LecturerStatus
}

/** What the lecturer pickers offer: staff without MANAGE_LECTURERS read these too, so nothing else about the lecturer */
export type GroupLecturerOption = Pick<Lecturer, 'id' | 'first_name' | 'last_name' | 'subjects'>

/** What the student picker offers: staff without MANAGE_STUDENTS read these too, so nothing else about the student */
export type GroupStudentOption = Pick<Student, 'id' | 'first_name' | 'last_name' | 'student_number'>

/** A student's time in a group; withdrawn_on is null while active. Re-enrolling adds a new one. */
export type GroupEnrolment = {
  id: string
  enrolled_on: string
  withdrawn_on: string | null
  student: GroupStudentOption & { status: StudentStatus }
}

export type Group = {
  id: string
  name: string
  capacity: number | null
  status: GroupStatus
  created_at: string
  course: CourseOption
  academic_year: GroupRelation
  academic_term: GroupRelation | null
  location: GroupRelation | null
  /** The permanent lecturer on the organization's today */
  lecturer: GroupLecturer | null
  /** The change still to come, with its first day; lecturer is null when the group is left without one */
  lecturer_change: { lecturer: GroupLecturer | null; start_date: string } | null
  /** In the organization's week, from its first day; empty for a group added before schedules existed */
  schedule: GroupScheduleEntry[]
  /** Students active in the group now; it's full when this reaches the capacity */
  enrolled_count: number
}

/** One permanent lecturer's stretch on a group; end_date is null while open */
export type GroupLecturerAssignment = {
  id: string
  lecturer: GroupLecturer
  start_date: string
  end_date: string | null
}

/** Someone covering a group; cancelled ones stay on record with cancelled_at set */
export type GroupSubstitution = {
  id: string
  lecturer: GroupLecturer
  start_date: string
  end_date: string
  note: string | null
  cancelled_at: string | null
}

/** Who has taught and covered a group, newest first */
export type GroupLecturerHistory = {
  assignments: GroupLecturerAssignment[]
  substitutions: GroupSubstitution[]
}

/** One page of groups in one status, with how many match the filters in each status */
export type GroupPage = {
  groups: Group[]
  total: number
  counts: Record<GroupStatus, number>
}

/** Whether a reschedule still moves its lesson, or was cancelled and the original came back */
export type LessonRescheduleStatus = 'ACTIVE' | 'CANCELLED'

/** One session of a group moved to another date and time; days are 'YYYY-MM-DD' and times 'HH:MM' */
export type LessonReschedule = {
  id: string
  original_date: string
  original_start_time: string
  /** Read from the weekly schedule; null once the schedule no longer has that session */
  original_end_time: string | null
  new_date: string
  new_start_time: string
  new_end_time: string
  /** For staff only */
  reason: string | null
  status: LessonRescheduleStatus
  created_at: string
  cancelled_at: string | null
}

/** A lesson moved to another date and time as students and lecturers read it: both slots, without the staff-only reason */
export type RescheduledLesson = {
  id: string
  group: { id: string; name: string; course: string }
  original_date: string
  original_start_time: string
  new_date: string
  new_start_time: string
  new_end_time: string
}
