import { z } from 'zod'

export { parentNoteSchema } from '@shigjetademy/shared/parent-notes'

export const parentNoteStudentParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  studentId: z.uuid('Invalid student id'),
})
