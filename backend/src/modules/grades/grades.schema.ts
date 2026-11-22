import { z } from 'zod'

export { gradeGroupQuerySchema, gradeReportQuerySchema } from '@shigjetademy/shared/grades'

export const gradeGroupParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
})

export const gradeStudentParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  studentId: z.uuid('Invalid student id'),
})
