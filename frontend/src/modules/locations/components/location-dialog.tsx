import { useId } from 'react'
import type { RefObject } from 'react'
import type { LocationInput, OrganizationLocation } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useLocationForm } from '../hooks/use-location-form'
import { useSaveLocation } from '../hooks/use-save-location'

export type LocationDialogMode = { kind: 'add'; isFirst: boolean } | { kind: 'edit'; location: OrganizationLocation }

interface LocationDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: LocationDialogMode
  onSaved: (saved: OrganizationLocation) => void
}

export function LocationDialog({ dialogRef, organizationId, mode, onSaved }: LocationDialogProps) {
  const isEditing = mode.kind === 'edit'
  // A new key per mode remounts the form, so it starts from that mode's values
  const formKey = isEditing ? `edit-${mode.location.id}` : 'add'

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: OrganizationLocation) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={isEditing ? `Edit ${mode.location.name}` : 'Add a location'}
      subtitle="A campus or branch where your organization teaches."
      onClose={handleClose}
    >
      <LocationForm key={formKey} organizationId={organizationId} mode={mode} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface LocationFormProps {
  organizationId: string
  mode: LocationDialogMode
  onSaved: (saved: OrganizationLocation) => void
  onCancel: () => void
}

function LocationForm({ organizationId, mode, onSaved, onCancel }: LocationFormProps) {
  const location = mode.kind === 'edit' ? mode.location : undefined
  const isFirst = mode.kind === 'add' && mode.isFirst
  const form = useLocationForm({ location, isFirst })
  const saveLocation = useSaveLocation(organizationId)
  const ids = { name: useId(), address: useId(), city: useId(), phone: useId(), isMain: useId(), mainHint: useId() }
  const { errors } = form.formState
  const isPending = saveLocation.isPending
  // The first location is always main, and the main one only changes by making another location main
  const isMainLocked = isFirst || !!location?.is_main
  const fieldError = (fieldName: keyof LocationInput) => getFieldError<LocationInput>({ fieldName, formErrors: errors, backendError: saveLocation.error })

  const handleSubmit = form.handleSubmit((input: LocationInput) => {
    saveLocation.mutate({ locationId: location?.id, input }, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField id={ids.name} label="Name" autoComplete="off" placeholder="Main campus" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <AuthField
          id={ids.address}
          label="Street address"
          autoComplete="street-address"
          disabled={isPending}
          error={fieldError('address')}
          {...form.register('address')}
        />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.city} label="City" autoComplete="address-level2" disabled={isPending} error={fieldError('city')} {...form.register('city')} />
          <AuthField id={ids.phone} label="Phone" type="tel" autoComplete="tel" disabled={isPending} error={fieldError('phone')} {...form.register('phone')} />
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-rule-strong px-3.5 py-3 has-disabled:bg-mist/60">
          {isMainLocked ? (
            <input id={ids.isMain} type="checkbox" className="mt-1 size-4 accent-green-deep" aria-describedby={ids.mainHint} checked disabled readOnly />
          ) : (
            <input id={ids.isMain} type="checkbox" className="mt-1 size-4 accent-green-deep" aria-describedby={ids.mainHint} disabled={isPending} {...form.register('is_main')} />
          )}
          <span className="grid gap-0.5">
            <label htmlFor={ids.isMain} className="font-semibold">
              Main location
            </label>
            <span id={ids.mainHint} className="text-[0.93rem] text-ink-3">
              <MainLocationHint isFirst={isFirst} isMain={!!location?.is_main} />
            </span>
          </span>
        </div>

        {saveLocation.isError ? <FormAlert>{getErrorMessage(saveLocation.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {location ? 'Save changes' : 'Add location'}
        </button>
      </footer>
    </form>
  )
}

interface MainLocationHintProps {
  isFirst: boolean
  isMain: boolean
}

function MainLocationHint({ isFirst, isMain }: MainLocationHintProps) {
  if (isFirst) return <>Your first location is always the main one.</>
  if (isMain) return <>To change this, make another location the main one.</>
  return <>The current main location stops being main.</>
}
