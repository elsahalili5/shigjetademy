import { useId } from 'react'
import type { ReactivateOrganizationInput } from '@shigjetademy/shared/organization-settings'
import { FormAlert } from '#/components/FormAlert'
import { SectionCard } from '#/components/SectionCard'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useReactivateOrganization } from '../hooks/use-reactivate-organization'
import { useReactivateOrganizationForm } from '../hooks/use-reactivate-organization-form'

interface ReactivateSectionProps {
  organizationId: string
  organizationName: string
}

/** The one thing the owner can do while the organization is deactivated: bring it back */
export function ReactivateSection({ organizationId, organizationName }: ReactivateSectionProps) {
  const form = useReactivateOrganizationForm()
  const reactivateOrganization = useReactivateOrganization()
  const passwordId = useId()
  const isPending = reactivateOrganization.isPending

  const handleSubmit = form.handleSubmit((input: ReactivateOrganizationInput) => {
    reactivateOrganization.mutate({ organizationId, ...input })
  })

  return (
    <SectionCard title="Reactivate the organization">
      <form className="grid gap-4 px-5 py-5" noValidate onSubmit={handleSubmit}>
        <p className="text-ink-2">
          {organizationName} is deactivated, so nobody in it can use Shigjetademy. Reactivate it to give everyone their access back, with all its data.
        </p>
        <AuthField
          id={passwordId}
          label="Your password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          error={getFieldError<ReactivateOrganizationInput>({ fieldName: 'password', formErrors: form.formState.errors, backendError: reactivateOrganization.error })}
          {...form.register('password')}
        />
        {reactivateOrganization.isError ? <FormAlert>{getErrorMessage(reactivateOrganization.error)}</FormAlert> : null}
        <div>
          <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={isPending}>
            {isPending ? 'Reactivating…' : 'Reactivate'}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
