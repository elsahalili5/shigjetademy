import { z } from 'zod'
import { TIME_PATTERN } from '@shigjetademy/shared/groups'

export { lessonPlanCoveredSchema, lessonPlanTopicSchema } from '@shigjetademy/shared/lesson-plans'

export const lessonPlanSessionsQuerySchema = z.object({
  date: z.iso.date('Invalid date'),
})

export const lessonPlanGroupParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
})

export const lessonPlanParamSchema = lessonPlanGroupParamSchema.extend({
  date: z.iso.date('Invalid date'),
  /** The session's start, which tells apart two sessions of the group that day */
  startTime: z.string().regex(TIME_PATTERN, 'Invalid start time'),
})
