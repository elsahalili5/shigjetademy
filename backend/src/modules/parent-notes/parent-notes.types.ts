import type { z } from 'zod'
import type { parentNoteStudentParamSchema } from './parent-notes.schema.ts'

export type { ParentNoteInput } from '@shigjetademy/shared/parent-notes'

export type ParentNoteStudentParam = z.infer<typeof parentNoteStudentParamSchema>
