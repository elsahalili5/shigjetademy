import type { z } from 'zod'
import type { studentParamSchema } from './students.schema.ts'

export type { CreateStudentInput, ListStudentsQuery, StudentStatus, UpdateStudentInput } from '@shigjetademy/shared/students'

export type StudentParam = z.infer<typeof studentParamSchema>
