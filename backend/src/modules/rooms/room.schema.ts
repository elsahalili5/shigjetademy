import { z } from 'zod'

export { roomSchema } from '@shigjetademy/shared/rooms'

export const locationRoomsParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  locationId: z.uuid('Invalid location id'),
})

export const roomParamSchema = locationRoomsParamSchema.extend({
  roomId: z.uuid('Invalid room id'),
})
