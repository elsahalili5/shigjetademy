import type { OrganizationRoom } from '@shigjetademy/shared/rooms'

// The same order as the server: by name
const byName = (a: OrganizationRoom, b: OrganizationRoom) => a.name.localeCompare(b.name)

type WithSavedRoomParams = {
  rooms: OrganizationRoom[]
  saved: OrganizationRoom
}

/** The cached list with a created or edited room in it */
export const withSavedRoom = ({ rooms, saved }: WithSavedRoomParams) => [...rooms.filter((room) => room.id !== saved.id), saved].sort(byName)
