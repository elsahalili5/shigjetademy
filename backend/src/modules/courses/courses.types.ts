import type { z } from 'zod'
import type { courseParamSchema } from './courses.schema.ts'

export type { CourseInput, CourseStatus, ListCoursesQuery } from '@shigjetademy/shared/courses'

export type CourseParam = z.infer<typeof courseParamSchema>
