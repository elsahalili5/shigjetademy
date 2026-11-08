import { z } from 'zod'

export const studentRosterParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  studentId: z.uuid('Invalid student id'),
})
