// The Lessons page and the group detail page's Lessons section share this shape.
// A lesson plan belongs to one lesson session: a group on a day at a start time, the same identity as an attendance register.
import { z } from 'zod'
import type { RescheduledFrom } from './attendance.ts'

/** A plan's free text; long enough for a paragraph or two, trimmed and turned to null when left empty */
const lessonPlanTextSchema = z
  .string()
  .max(4000, 'Keep it under 4000 characters.')
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? ''
    return trimmed === '' ? null : trimmed
  })

/** The topic planned ahead of the session; settable at any time */
export const lessonPlanTopicSchema = z.object({
  topic: lessonPlanTextSchema,
})

export type LessonPlanTopicInput = z.infer<typeof lessonPlanTopicSchema>

/** What was covered in the session; settable only from its start time on */
export const lessonPlanCoveredSchema = z.object({
  covered: lessonPlanTextSchema,
})

export type LessonPlanCoveredInput = z.infer<typeof lessonPlanCoveredSchema>

/** One lesson session's plan, as the API answers it */
export type LessonPlan = {
  group_id: string
  date: string
  start_time: string
  end_time: string
  /** Set for a session moved here from another date or time */
  rescheduled_from: RescheduledFrom | null
  topic: string | null
  covered: string | null
  /** Whether this user may set covered right now: the session has started; there is no upper bound. Reaching this plan at all already means they may set topic */
  can_edit_covered: boolean
}

/** One lesson session on a day, for the Lessons page's day picker; a group meeting twice that day has two */
export type LessonPlanSession = {
  group_id: string
  name: string
  course: string
  location: string | null
  start_time: string
  end_time: string
  /** Set for a session moved here from another date or time */
  rescheduled_from: RescheduledFrom | null
}
