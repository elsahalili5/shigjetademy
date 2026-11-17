import { z } from 'zod'

export { assignmentGroupQuerySchema, createAssignmentSchema, handInSchema, markHandInSchema, updateAssignmentSchema } from '@shigjetademy/shared/assignments'

export const assignmentParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  assignmentId: z.uuid('Invalid assignment id'),
})

export const submissionParamSchema = assignmentParamSchema.extend({
  submissionId: z.uuid('Invalid hand-in id'),
})
