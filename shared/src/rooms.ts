// The room form and the endpoint that stores rooms share this schema.
import { z } from 'zod'

const NAME_MAX = 80

const CAPACITY_MAX = 1000

export const roomSchema = z.object({
  name: z.string().trim().min(1, 'Enter the room’s name.').max(NAME_MAX, `Keep the name under ${NAME_MAX} characters.`),
  capacity: z.number('Enter a whole number.').int('Enter a whole number.').min(1, 'Enter at least 1 seat.').max(CAPACITY_MAX, `Keep it to ${CAPACITY_MAX} seats.`).nullable(),
})

export type RoomInput = z.infer<typeof roomSchema>

/** A room, always at one of the organization's locations */
export type OrganizationRoom = {
  id: string
  name: string
  capacity: number | null
  location_id: string
  created_at: string
}

/** A room as the group forms offer it, with the location it belongs to */
export type GroupRoomOption = {
  id: string
  name: string
  location: { id: string; name: string }
}
