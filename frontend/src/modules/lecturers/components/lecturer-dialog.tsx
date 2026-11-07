import { useId } from 'react'
import type { RefObject } from 'react'
import { Controller } from 'react-hook-form'
import { EMPLOYMENT_TYPES, getLecturerName } from '@shigjetademy/shared/lecturers'
import type { Lecturer, LecturerInput } from '@shigjetademy/shared/lecturers'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField, FieldError } from '#/modules/auth/components/auth-field'
import { useLecturerForm } from '../hooks/use-lecturer-form'
import { useSaveLecturer } from '../hooks/use-save-lecturer'
import { EMPLOYMENT_TYPE_LABELS } from '../utils/employment-type-labels'
import { SubjectInput } from './subject-input'

export type LecturerDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; lecturer: Lecturer }

/** The organization's places and subjects the form offers */
export type LecturerFormOptions = {
  locations: OrganizationLocation[]
  departments: OrganizationDepartment[]
  subjects: string[]
}

interface LecturerDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: LecturerDialogMode
  options: LecturerFormOptions
  onSaved: (saved: Lecturer) => void
}

export function LecturerDialog({ dialogRef, organizationId, mode, options, onSaved }: LecturerDialogProps) {
  const lecturer = mode.kind === 'edit' ? mode.lecturer : undefined
  // A new key per opening remounts the form, so every add starts empty and every edit from the lecturer's values
  const formKey = mode.kind === 'edit' ? `edit-${mode.lecturer.id}` : `add-${mode.openCount}`

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: Lecturer) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={lecturer ? `Edit ${getLecturerName(lecturer)}` : 'Add a lecturer'}
      subtitle="A record the school keeps, with what and where they teach. A login is optional."
      onClose={handleClose}
    >
      <LecturerForm key={formKey} organizationId={organizationId} lecturer={lecturer} options={options} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface LecturerFormProps {
  organizationId: string
  lecturer?: Lecturer
  options: LecturerFormOptions
  onSaved: (saved: Lecturer) => void
  onCancel: () => void
}

function LecturerForm({ organizationId, lecturer, options, onSaved, onCancel }: LecturerFormProps) {
  const form = useLecturerForm(lecturer)
  const saveLecturer = useSaveLecturer(organizationId)
  const ids = {
    firstName: useId(),
    lastName: useId(),
    email: useId(),
    phone: useId(),
    subjects: useId(),
    employmentType: useId(),
    startedOn: useId(),
    department: useId(),
    locations: useId(),
    notes: useId(),
  }
  const { errors } = form.formState
  const isPending = saveLecturer.isPending
  const fieldError = (fieldName: keyof LecturerInput) => getFieldError<LecturerInput>({ fieldName, formErrors: errors, backendError: saveLecturer.error })

  const handleSubmit = form.handleSubmit((input: LecturerInput) => {
    const params = lecturer ? { kind: 'edit' as const, lecturerId: lecturer.id, input } : { kind: 'add' as const, input }
    saveLecturer.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.firstName} label="First name" autoComplete="off" disabled={isPending} error={fieldError('first_name')} {...form.register('first_name')} />
          <AuthField id={ids.lastName} label="Last name" autoComplete="off" disabled={isPending} error={fieldError('last_name')} {...form.register('last_name')} />
        </div>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.email} label="Email (optional)" type="email" inputMode="email" autoComplete="off" disabled={isPending} error={fieldError('email')} {...form.register('email')} />
          <AuthField id={ids.phone} label="Phone (optional)" type="tel" autoComplete="off" disabled={isPending} error={fieldError('phone')} {...form.register('phone')} />
        </div>
        <Controller
          control={form.control}
          name="subjects"
          render={({ field }) => (
            <SubjectInput id={ids.subjects} value={field.value} suggestions={options.subjects} isDisabled={isPending} error={fieldError('subjects')} onChange={field.onChange} />
          )}
        />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <SelectField id={ids.employmentType} label="Employment type" disabled={isPending} error={fieldError('employment_type')} {...form.register('employment_type')}>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <AuthField id={ids.startedOn} label="Started on (optional)" type="date" disabled={isPending} error={fieldError('started_on')} {...form.register('started_on')} />
        </div>
        <Controller
          control={form.control}
          name="department_id"
          render={({ field }) => (
            <SelectField
              id={ids.department}
              label="Department"
              hint="(optional)"
              disabled={isPending}
              error={fieldError('department_id')}
              name={field.name}
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value || null)}
            >
              <option value="">No department</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
          )}
        />
        <Controller
          control={form.control}
          name="location_ids"
          render={({ field }) => (
            <LocationChoices id={ids.locations} locations={options.locations} value={field.value} isDisabled={isPending} error={fieldError('location_ids')} onChange={field.onChange} />
          )}
        />
        <AuthField id={ids.notes} label="Notes (optional)" autoComplete="off" disabled={isPending} error={fieldError('notes')} {...form.register('notes')} />

        {saveLecturer.isError ? <FormAlert>{getErrorMessage(saveLecturer.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {lecturer ? 'Save changes' : 'Add lecturer'}
        </button>
      </footer>
    </form>
  )
}

interface LocationChoicesProps {
  id: string
  locations: OrganizationLocation[]
  value: string[]
  isDisabled: boolean
  error?: string
  onChange: (locationIds: string[]) => void
}

/** One checkbox per location of the organization; a lecturer may teach at any number of them */
function LocationChoices({ id, locations, value, isDisabled, error, onChange }: LocationChoicesProps) {
  const errorId = `${id}-error`

  const handleToggle = (locationId: string) => onChange(value.includes(locationId) ? value.filter((item) => item !== locationId) : [...value, locationId])

  return (
    <fieldset className="grid min-w-0 gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="pb-1.5 text-[0.987rem] font-[650]">
        Locations <span className="ml-1.5 font-normal text-ink-3">(optional)</span>
      </legend>
      {locations.length === 0 ? (
        <p className="text-[0.93rem] text-ink-3">Your organization has no locations yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {locations.map((location) => (
            <label
              key={location.id}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-3.5 has-checked:border-green-deep has-checked:bg-green-wash"
            >
              <input type="checkbox" className="size-4 accent-green-deep" checked={value.includes(location.id)} disabled={isDisabled} onChange={() => handleToggle(location.id)} />
              {location.name}
            </label>
          ))}
        </div>
      )}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  )
}
