import type { z } from 'zod'
import type { gradeGroupParamSchema, gradeStudentParamSchema } from './grades.schema.ts'

export type { GradeGroupQuery, GradeReportQuery } from '@shigjetademy/shared/grades'

export type GradeGroupParam = z.infer<typeof gradeGroupParamSchema>

export type GradeStudentParam = z.infer<typeof gradeStudentParamSchema>
