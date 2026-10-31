import { z } from 'zod'

export { departmentSchema, locationSchema, removeLocationQuerySchema } from '@shigjetademy/shared/location'

export const locationParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  locationId: z.uuid('Invalid location id'),
})

export const departmentParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  departmentId: z.uuid('Invalid department id'),
})
