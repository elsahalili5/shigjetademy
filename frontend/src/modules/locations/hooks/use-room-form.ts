import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { roomSchema } from '@shigjetademy/shared/rooms'
import type { OrganizationRoom, RoomInput } from '@shigjetademy/shared/rooms'

export function useRoomForm(room?: OrganizationRoom) {
  return useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: { name: room?.name ?? '', capacity: room?.capacity ?? null },
  })
}
