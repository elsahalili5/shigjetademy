import { z } from 'zod'
import { TIME_PATTERN } from '@shigjetademy/shared/groups'

export { attendanceGroupsQuerySchema, attendanceMarkSchema } from '@shigjetademy/shared/attendance'

export const registerParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
  date: z.iso.date('Invalid date'),
  /** The session's start, which tells apart two sessions of the group that day */
  startTime: z.string().regex(TIME_PATTERN, 'Invalid start time'),
})

export const registerStudentParamSchema = registerParamSchema.extend({
  studentId: z.uuid('Invalid student id'),
})
