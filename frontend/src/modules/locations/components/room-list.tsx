import { useState } from 'react'
import { DoorOpen, Plus } from 'lucide-react'
import type { OrganizationRoom } from '@shigjetademy/shared/rooms'
import { LoadError } from '#/components/LoadError'
import { RowAction, RowActions } from './row-actions'

const getSeats = (capacity: number) => (capacity === 1 ? '1 seat' : `${capacity} seats`)

interface RoomListProps {
  status: 'pending' | 'error' | 'success'
  rooms?: OrganizationRoom[]
  isOwner: boolean
  onRetry: () => void
  onAdd: () => void
  onEdit: (room: OrganizationRoom) => void
  onRemove: (room: OrganizationRoom) => void
}

/** A location's own rooms, shown under it; owners add, edit and remove them */
export function RoomList({ status, rooms, isOwner, onRetry, onAdd, onEdit, onRemove }: RoomListProps) {
  return (
    <div className="grid w-full gap-2 border-t border-rule px-5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.87rem] font-[650] text-ink-3">Rooms</span>
        {isOwner ? (
          <button type="button" className="button button--ghost min-h-8 px-2.5 text-[0.87rem]" onClick={onAdd}>
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            Add room
          </button>
        ) : null}
      </div>
      <RoomListBody status={status} rooms={rooms} isOwner={isOwner} onRetry={onRetry} onEdit={onEdit} onRemove={onRemove} />
    </div>
  )
}

interface RoomListBodyProps {
  status: 'pending' | 'error' | 'success'
  rooms?: OrganizationRoom[]
  isOwner: boolean
  onRetry: () => void
  onEdit: (room: OrganizationRoom) => void
  onRemove: (room: OrganizationRoom) => void
}

function RoomListBody({ status, rooms, isOwner, onRetry, onEdit, onRemove }: RoomListBodyProps) {
  if (status === 'error') return <LoadError what="rooms" onRetry={onRetry} />
  if (!rooms) return <p className="text-[0.88rem] text-ink-3">Loading…</p>
  if (rooms.length === 0) return <p className="text-[0.88rem] text-ink-3">No rooms yet.</p>

  return (
    <ul aria-label="Rooms" className="grid gap-1.5">
      {rooms.map((room) => (
        <RoomRow key={room.id} room={room} isOwner={isOwner} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </ul>
  )
}

interface RoomRowProps {
  room: OrganizationRoom
  isOwner: boolean
  onEdit: (room: OrganizationRoom) => void
  onRemove: (room: OrganizationRoom) => void
}

function RoomRow({ room, isOwner, onEdit, onRemove }: RoomRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <DoorOpen className="text-ink-3" size={15} strokeWidth={1.8} aria-hidden="true" />
      <span className="font-medium">{room.name}</span>
      {room.capacity !== null ? <span className="text-[0.86rem] text-ink-3">{getSeats(room.capacity)}</span> : null}
      {isOwner ? (
        <span className="ml-auto">
          <RoomActions room={room} onEdit={onEdit} onRemove={onRemove} />
        </span>
      ) : null}
    </li>
  )
}

type RoomActionsProps = Omit<RoomRowProps, 'isOwner'>

/** Edit and remove; removing asks once */
function RoomActions({ room, onEdit, onRemove }: RoomActionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  const handleConfirmRemove = () => {
    setIsConfirmingRemove(false)
    onRemove(room)
  }

  if (!isConfirmingRemove) {
    return <RowActions onEdit={() => onEdit(room)} onRemove={() => setIsConfirmingRemove(true)} />
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Remove ${room.name}`}>
      <span className="text-[0.93rem] text-ink-2">This can’t be undone.</span>
      <RowAction label="Remove" tone="confirm" onClick={handleConfirmRemove} />
      <RowAction label="Keep" tone="ghost" onClick={() => setIsConfirmingRemove(false)} />
    </span>
  )
}
