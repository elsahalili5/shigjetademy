import { z } from 'zod'

export const updateUserSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required').max(80).optional(),
    last_name: z.string().trim().min(1, 'Last name is required').max(80).optional(),
    email: z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email address')).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'LOCKED', 'DISABLED'], { error: 'Please select a valid status' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'No fields to update')

export const userIdParamSchema = z.object({
  userId: z.uuid('Invalid user id'),
})
