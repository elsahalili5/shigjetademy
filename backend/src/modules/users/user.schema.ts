import { z } from 'zod'
import { emailSchema, nameSchema } from '@shigjetademy/shared/auth'

export const updateUserSchema = z
  .object({
    first_name: nameSchema('First name is required').optional(),
    last_name: nameSchema('Last name is required').optional(),
    email: emailSchema.optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'LOCKED', 'DISABLED'], { error: 'Please select a valid status' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'No fields to update')

export const userIdParamSchema = z.object({
  userId: z.uuid('Invalid user id'),
})
