import { z } from 'zod'

export { guardianSchema } from '@shigjetademy/shared/guardians'

export const studentGuardianParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  studentId: z.uuid('Invalid student id'),
  guardianId: z.uuid('Invalid guardian id'),
})

export const guardianParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  guardianId: z.uuid('Invalid guardian id'),
})
