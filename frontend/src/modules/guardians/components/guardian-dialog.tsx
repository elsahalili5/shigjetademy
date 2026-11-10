import { useId } from 'react'
import type { RefObject } from 'react'
import { GUARDIAN_RELATIONSHIPS, getGuardianName } from '@shigjetademy/shared/guardians'
import type { GuardianInput, StudentGuardian } from '@shigjetademy/shared/guardians'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useGuardianForm } from '../hooks/use-guardian-form'
import { useSaveGuardian } from '../hooks/use-save-guardian'
import { RELATIONSHIP_LABELS } from '../utils/relationship-labels'

export type GuardianDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; guardian: StudentGuardian }

interface GuardianDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  studentId: string
  studentName: string
  mode: GuardianDialogMode
  onSaved: (saved: StudentGuardian) => void
}

export function GuardianDialog({ dialogRef, organizationId, studentId, studentName, mode, onSaved }: GuardianDialogProps) {
  const guardian = mode.kind === 'edit' ? mode.guardian : undefined
  // A new key per opening remounts the form, so every add starts empty and every edit from the guardian's values
  const formKey = mode.kind === 'edit' ? `edit-${mode.guardian.id}` : `add-${mode.openCount}`

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: StudentGuardian) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={guardian ? `Edit ${getGuardianName(guardian)}` : `Add a guardian for ${studentName}`}
      subtitle="Someone with the same email is linked as they are, not added twice."
      onClose={handleClose}
    >
      <GuardianForm key={formKey} organizationId={organizationId} studentId={studentId} guardian={guardian} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface GuardianFormProps {
  organizationId: string
  studentId: string
  guardian?: StudentGuardian
  onSaved: (saved: StudentGuardian) => void
  onCancel: () => void
}

function GuardianForm({ organizationId, studentId, guardian, onSaved, onCancel }: GuardianFormProps) {
  const form = useGuardianForm(guardian)
  const saveGuardian = useSaveGuardian({ organizationId, studentId })
  const ids = { firstName: useId(), lastName: useId(), relationship: useId(), email: useId(), phone: useId() }
  const { errors } = form.formState
  const isPending = saveGuardian.isPending
  const fieldError = (fieldName: keyof GuardianInput) => getFieldError({ fieldName, formErrors: errors, backendError: saveGuardian.error })
  // A field error from the server already shows under its field
  const hasFormError = saveGuardian.isError && !fieldError('email')

  const handleSubmit = form.handleSubmit((input: GuardianInput) => {
    const params = guardian ? { kind: 'edit' as const, guardianId: guardian.id, input } : { kind: 'add' as const, input }
    saveGuardian.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.firstName} label="First name" autoComplete="off" disabled={isPending} error={fieldError('first_name')} {...form.register('first_name')} />
          <AuthField id={ids.lastName} label="Last name" autoComplete="off" disabled={isPending} error={fieldError('last_name')} {...form.register('last_name')} />
        </div>
        <SelectField id={ids.relationship} label="Relationship" disabled={isPending} error={fieldError('relationship')} {...form.register('relationship')}>
          <option value="">Choose how they’re related</option>
          {GUARDIAN_RELATIONSHIPS.map((relationship) => (
            <option key={relationship} value={relationship}>
              {RELATIONSHIP_LABELS[relationship]}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField
            id={ids.email}
            label="Email (optional)"
            type="email"
            autoComplete="off"
            inputMode="email"
            disabled={isPending}
            error={fieldError('email')}
            {...form.register('email')}
          />
          <AuthField id={ids.phone} label="Phone (optional)" type="tel" autoComplete="off" disabled={isPending} error={fieldError('phone')} {...form.register('phone')} />
        </div>
        <p className="text-[0.93rem] text-ink-3">An email is needed before you can invite them to log in.</p>

        {hasFormError ? <FormAlert>{getErrorMessage(saveGuardian.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {guardian ? 'Save changes' : 'Add guardian'}
        </button>
      </footer>
    </form>
  )
}
