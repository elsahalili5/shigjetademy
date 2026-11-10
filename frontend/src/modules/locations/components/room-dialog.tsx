import { useId } from 'react'
import type { RefObject } from 'react'
import { Controller } from 'react-hook-form'
import type { OrganizationRoom, RoomInput } from '@shigjetademy/shared/rooms'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useRoomForm } from '../hooks/use-room-form'
import { useSaveRoom } from '../hooks/use-save-room'

export type RoomDialogMode = { kind: 'add' } | { kind: 'edit'; room: OrganizationRoom }

interface RoomDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  locationId: string
  mode: RoomDialogMode
  onSaved: (saved: OrganizationRoom) => void
}

export function RoomDialog({ dialogRef, organizationId, locationId, mode, onSaved }: RoomDialogProps) {
  const isEditing = mode.kind === 'edit'
  // A new key per mode remounts the form, so it starts from that mode's values
  const formKey = isEditing ? `edit-${mode.room.id}` : 'add'

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: OrganizationRoom) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog dialogRef={dialogRef} title={isEditing ? `Edit ${mode.room.name}` : 'Add a room'} subtitle="A room at this location, like Room 101." onClose={handleClose}>
      <RoomForm key={formKey} organizationId={organizationId} locationId={locationId} room={isEditing ? mode.room : undefined} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface RoomFormProps {
  organizationId: string
  locationId: string
  room?: OrganizationRoom
  onSaved: (saved: OrganizationRoom) => void
  onCancel: () => void
}

function RoomForm({ organizationId, locationId, room, onSaved, onCancel }: RoomFormProps) {
  const form = useRoomForm(room)
  const saveRoom = useSaveRoom()
  const ids = { name: useId(), capacity: useId() }
  const { errors } = form.formState
  const isPending = saveRoom.isPending
  const fieldError = (fieldName: keyof RoomInput) => getFieldError<RoomInput>({ fieldName, formErrors: errors, backendError: saveRoom.error })

  const handleSubmit = form.handleSubmit((input: RoomInput) => {
    saveRoom.mutate({ organizationId, locationId, roomId: room?.id, input }, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField id={ids.name} label="Name" autoComplete="off" placeholder="Room 101" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <Controller
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <AuthField
              id={ids.capacity}
              label="Capacity (optional)"
              type="number"
              inputMode="numeric"
              min={1}
              autoComplete="off"
              disabled={isPending}
              error={fieldError('capacity')}
              name={field.name}
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
            />
          )}
        />

        {saveRoom.isError ? <FormAlert>{getErrorMessage(saveRoom.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {room ? 'Save changes' : 'Add room'}
        </button>
      </footer>
    </form>
  )
}
