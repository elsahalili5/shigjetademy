import { useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { DeactivateOrganizationInput } from '@shigjetademy/shared/organization-settings'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SectionCard } from '#/components/SectionCard'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useDeactivateOrganization } from '../hooks/use-deactivate-organization'
import { useDeactivateOrganizationForm } from '../hooks/use-deactivate-organization-form'

interface DangerZoneSectionProps {
  organizationId: string
  organizationName: string
}

/** Deactivating stops everyone from using the organization until the owner reactivates it; nothing is deleted */
export function DangerZoneSection({ organizationId, organizationName }: DangerZoneSectionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [formKey, setFormKey] = useState(0)

  const handleOpen = () => {
    setFormKey((key) => key + 1)
    dialogRef.current?.showModal()
  }

  const handleClose = () => dialogRef.current?.close()

  return (
    <SectionCard title="Danger zone">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="grid max-w-[60ch] gap-1">
          <h3 className="font-[650]">Deactivate the organization</h3>
          <p className="text-ink-2">
            Nobody in {organizationName} can use Shigjetademy until you reactivate it here. Its data stays as it is.
          </p>
        </div>
        <button type="button" className="button min-h-11 border border-coral-deep px-4 text-base text-coral-deep hover:bg-coral-wash" onClick={handleOpen}>
          Deactivate organization…
        </button>
      </div>
      <DeactivateDialog dialogRef={dialogRef} formKey={formKey} organizationId={organizationId} organizationName={organizationName} onClose={handleClose} />
    </SectionCard>
  )
}

interface DeactivateDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  /** Changes on every open, so the form starts empty again */
  formKey: number
  organizationId: string
  organizationName: string
  onClose: () => void
}

function DeactivateDialog({ dialogRef, formKey, organizationId, organizationName, onClose }: DeactivateDialogProps) {
  return (
    <FormDialog dialogRef={dialogRef} title={`Deactivate ${organizationName}`} subtitle="Everyone loses access until you reactivate it." onClose={onClose}>
      <DeactivateForm key={formKey} organizationId={organizationId} organizationName={organizationName} onClose={onClose} />
    </FormDialog>
  )
}

interface DeactivateFormProps {
  organizationId: string
  organizationName: string
  onClose: () => void
}

function DeactivateForm({ organizationId, organizationName, onClose }: DeactivateFormProps) {
  const form = useDeactivateOrganizationForm(organizationName)
  const deactivateOrganization = useDeactivateOrganization()
  const ids = { name: useId(), password: useId() }
  const { errors } = form.formState
  const isPending = deactivateOrganization.isPending
  const fieldError = (fieldName: keyof DeactivateOrganizationInput) =>
    getFieldError<DeactivateOrganizationInput>({ fieldName, formErrors: errors, backendError: deactivateOrganization.error })

  const handleSubmit = form.handleSubmit((input: DeactivateOrganizationInput) => {
    deactivateOrganization.mutate({ organizationId, ...input }, { onSuccess: onClose })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <p className="text-ink-2">
          Type <strong className="font-[650] text-ink">{organizationName}</strong> to confirm.
        </p>
        <AuthField id={ids.name} label="Organization name" autoComplete="off" disabled={isPending} error={fieldError('confirm_name')} {...form.register('confirm_name')} />
        <AuthField
          id={ids.password}
          label="Your password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          error={fieldError('password')}
          {...form.register('password')}
        />
        {deactivateOrganization.isError ? <FormAlert>{getErrorMessage(deactivateOrganization.error)}</FormAlert> : null}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="button min-h-11 bg-coral-deep px-5 text-base text-white" disabled={isPending}>
          {isPending ? 'Deactivating…' : 'Deactivate'}
        </button>
      </footer>
    </form>
  )
}
