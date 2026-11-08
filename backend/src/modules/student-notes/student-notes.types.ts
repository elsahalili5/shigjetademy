import type { z } from 'zod'
import type { createStudentNoteSchema } from '@shigjetademy/shared/student-notes'
import type { studentRosterParamSchema } from '@modules/student-roster/student-roster.schema.ts'

export type StudentNoteParam = z.infer<typeof studentRosterParamSchema>

export type CreateStudentNoteInput = z.infer<typeof createStudentNoteSchema>
