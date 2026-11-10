import type { z } from 'zod'
import type { guardianParamSchema, studentGuardianParamSchema } from './guardians.schema.ts'

export type { Guardian, GuardianInput, GuardianLoginStatus, StudentGuardian } from '@shigjetademy/shared/guardians'

export type StudentGuardianParam = z.infer<typeof studentGuardianParamSchema>

export type GuardianParam = z.infer<typeof guardianParamSchema>
