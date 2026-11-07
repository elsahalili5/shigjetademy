import { z } from 'zod'

export { courseSchema, listCoursesQuerySchema } from '@shigjetademy/shared/courses'

export const courseParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  courseId: z.uuid('Invalid course id'),
})
