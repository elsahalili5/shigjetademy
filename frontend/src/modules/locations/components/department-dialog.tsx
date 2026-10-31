import { useId } from 'react'
import type { RefObject } from 'react'
import type { DepartmentInput, OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useDepartmentForm } from '../hooks/use-department-form'
import { useSaveDepartment } from '../hooks/use-save-department'

export type DepartmentDialogMode = { kind: 'add' } | { kind: 'edit'; department: OrganizationDepartment }

interface DepartmentDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: DepartmentDialogMode
  locations: OrganizationLocation[]
  onSaved: (saved: OrganizationDepartment) => void
}

export function DepartmentDialog({ dialogRef, organizationId, mode, locations, onSaved }: DepartmentDialogProps) {
  const isEditing = mode.kind === 'edit'
  // A new key per mode remounts the form, so it starts from that mode's values
  const formKey = isEditing ? `edit-${mode.department.id}` : 'add'

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: OrganizationDepartment) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={isEditing ? `Edit ${mode.department.name}` : 'Add a department'}
      subtitle="A part of your organization, like Languages or Sciences."
      onClose={handleClose}
    >
      <DepartmentForm
        key={formKey}
        organizationId={organizationId}
        department={isEditing ? mode.department : undefined}
        locations={locations}
        onSaved={handleSaved}
        onCancel={handleClose}
      />
    </FormDialog>
  )
}

interface DepartmentFormProps {
  organizationId: string
  department?: OrganizationDepartment
  locations: OrganizationLocation[]
  onSaved: (saved: OrganizationDepartment) => void
  onCancel: () => void
}

function DepartmentForm({ organizationId, department, locations, onSaved, onCancel }: DepartmentFormProps) {
  const departmentForm = useDepartmentForm(department)
  const saveDepartment = useSaveDepartment(organizationId)
  const { form } = departmentForm
  const ids = { name: useId(), description: useId(), location: useId() }
  const { errors } = form.formState
  const isPending = saveDepartment.isPending
  const fieldError = (fieldName: keyof DepartmentInput) => getFieldError<DepartmentInput>({ fieldName, formErrors: errors, backendError: saveDepartment.error })

  const handleSubmit = form.handleSubmit((input: DepartmentInput) => {
    saveDepartment.mutate({ departmentId: department?.id, input }, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField id={ids.name} label="Name" autoComplete="off" placeholder="Languages" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <AuthField
          id={ids.description}
          label="Description (optional)"
          autoComplete="off"
          disabled={isPending}
          error={fieldError('description')}
          {...form.register('description')}
        />
        <SelectField id={ids.location} label="Location" hint="Optional" disabled={isPending} error={fieldError('location_id')} {...departmentForm.locationField}>
          <option value="">No location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </SelectField>

        {saveDepartment.isError ? <FormAlert>{getErrorMessage(saveDepartment.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {department ? 'Save changes' : 'Add department'}
        </button>
      </footer>
    </form>
  )
}
