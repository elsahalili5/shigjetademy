import type { z } from 'zod'
import type { updateUserSchema, userIdParamSchema } from './user.schema.ts'

export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserIdParam = z.infer<typeof userIdParamSchema>
