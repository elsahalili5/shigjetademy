import type { z } from 'zod'
import type { locationRoomsParamSchema, roomParamSchema } from './room.schema.ts'

export type { RoomInput } from '@shigjetademy/shared/rooms'

export type LocationRoomsParam = z.infer<typeof locationRoomsParamSchema>

export type RoomParam = z.infer<typeof roomParamSchema>
