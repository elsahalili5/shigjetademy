import { z } from 'zod'

export { createStudentSchema, listStudentsQuerySchema, updateStudentSchema } from '@shigjetademy/shared/students'

export const studentParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  studentId: z.uuid('Invalid student id'),
})
