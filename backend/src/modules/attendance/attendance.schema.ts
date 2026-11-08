import { z } from 'zod'

export { attendanceGroupsQuerySchema, attendanceMarkSchema } from '@shigjetademy/shared/attendance'

export const registerParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
  date: z.iso.date('Invalid date'),
})

export const registerStudentParamSchema = registerParamSchema.extend({
  studentId: z.uuid('Invalid student id'),
})
