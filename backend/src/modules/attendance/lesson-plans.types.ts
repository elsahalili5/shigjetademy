import type { z } from 'zod'
import type { lessonPlanGroupParamSchema, lessonPlanParamSchema, lessonPlanSessionsQuerySchema } from './lesson-plans.schema.ts'

export type { LessonPlanCoveredInput, LessonPlanTopicInput } from '@shigjetademy/shared/lesson-plans'

export type LessonPlanSessionsQuery = z.infer<typeof lessonPlanSessionsQuerySchema>

export type LessonPlanGroupParam = z.infer<typeof lessonPlanGroupParamSchema>

export type LessonPlanParam = z.infer<typeof lessonPlanParamSchema>
