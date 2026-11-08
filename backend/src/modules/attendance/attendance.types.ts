import type { z } from 'zod'
import type { registerParamSchema, registerStudentParamSchema } from './attendance.schema.ts'

export type { AttendanceGroupsQuery, AttendanceMarkInput } from '@shigjetademy/shared/attendance'

export type RegisterParam = z.infer<typeof registerParamSchema>

export type RegisterStudentParam = z.infer<typeof registerStudentParamSchema>
