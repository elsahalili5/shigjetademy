import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { RoomInput } from './room.types.ts'

const roomSelect = { id: true, name: true, capacity: true, location_id: true, created_at: true } as const

type FindLocationParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  locationId: string
}

/** The location must be the organization's own, or a 404 */
const findLocation = async ({ tx, organizationId, locationId }: FindLocationParams) => {
  const location = await tx.location.findFirst({ where: { id: locationId, organization_id: organizationId }, select: { id: true } })
  if (!location) {
    throw new HttpError(404, 'Location not found')
  }
}

type ListRoomsParams = {
  organizationId: string
  locationId: string
}

type RoomChangeParams = ListRoomsParams & {
  roomId: string
  actorId: string
}

type CreateRoomParams = ListRoomsParams & {
  actorId: string
  data: RoomInput
}

type UpdateRoomParams = RoomChangeParams & {
  data: RoomInput
}

type FindRoomParams = {
  tx: Prisma.TransactionClient
  locationId: string
  roomId: string
}

/** The location's own room, or a 404 */
const findRoom = async ({ tx, locationId, roomId }: FindRoomParams) => {
  const room = await tx.room.findFirst({ where: { id: roomId, location_id: locationId }, select: { name: true } })
  if (!room) {
    throw new HttpError(404, 'Room not found')
  }
  return room
}

export const RoomService = {
  listRooms: ({ organizationId, locationId }: ListRoomsParams) =>
    prisma.$transaction(async (tx) => {
      await findLocation({ tx, organizationId, locationId })
      return tx.room.findMany({ where: { location_id: locationId }, orderBy: { name: 'asc' }, select: roomSelect })
    }),

  /** Every room across the organization's locations, for the group form's room picker */
  listOrganizationRooms: (organizationId: string) =>
    prisma.room.findMany({
      where: { location: { organization_id: organizationId } },
      orderBy: [{ location: { name: 'asc' } }, { name: 'asc' }],
      select: { id: true, name: true, location: { select: { id: true, name: true } } },
    }),

  createRoom: ({ organizationId, locationId, actorId, data }: CreateRoomParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findLocation({ tx, organizationId, locationId })
      const room = await tx.room.create({ data: { location_id: locationId, name: data.name, capacity: data.capacity }, select: roomSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ROOM_CREATED', organization_id: organizationId, subject_name: room.name } })
      return room
    }),

  updateRoom: ({ organizationId, locationId, roomId, actorId, data }: UpdateRoomParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findLocation({ tx, organizationId, locationId })
      await findRoom({ tx, locationId, roomId })
      const room = await tx.room.update({ where: { id: roomId }, data: { name: data.name, capacity: data.capacity }, select: roomSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ROOM_UPDATED', organization_id: organizationId, subject_name: room.name } })
      return room
    }),

  removeRoom: ({ organizationId, locationId, roomId, actorId }: RoomChangeParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findLocation({ tx, organizationId, locationId })
      const room = await findRoom({ tx, locationId, roomId })
      await tx.room.delete({ where: { id: roomId } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ROOM_REMOVED', organization_id: organizationId, subject_name: room.name } })
    }),
}
