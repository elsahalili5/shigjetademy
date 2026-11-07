import type { z } from 'zod'
import type { lecturerParamSchema } from './lecturers.schema.ts'

export type { LecturerInput, LecturerLoginStatus, LecturerStatus, ListLecturersQuery } from '@shigjetademy/shared/lecturers'

export type LecturerParam = z.infer<typeof lecturerParamSchema>
