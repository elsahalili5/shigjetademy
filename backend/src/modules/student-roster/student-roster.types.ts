import type { z } from 'zod'
import type { studentRosterParamSchema } from './student-roster.schema.ts'

export type StudentRosterParam = z.infer<typeof studentRosterParamSchema>
