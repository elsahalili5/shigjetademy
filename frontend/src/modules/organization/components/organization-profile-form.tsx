import { useId } from 'react'
import { COUNTRIES, CURRENCIES, ORGANIZATION_NAME_MAX, ORGANIZATION_TYPES, STUDENT_COUNTS } from '@shigjetademy/shared/organization'
import type { OrganizationProfile, UpdateOrganizationProfileInput } from '@shigjetademy/shared/organization'
import { FormAlert } from '#/components/FormAlert'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { FormSuccess } from '#/modules/auth/components/form-success'
import { useOrganizationProfileForm } from '../hooks/use-organization-profile-form'
import { useUpdateOrganizationProfile } from '../hooks/use-update-organization-profile'
import { currencyNames, regionNames } from '../utils/format'
import { toProfileFormValues } from '../utils/profile-form-values'

interface OrganizationProfileFormProps {
  organizationId: string
  profile: OrganizationProfile
}

/** The owner's edit form for the organization's details and contact information */
export function OrganizationProfileForm({ organizationId, profile }: OrganizationProfileFormProps) {
  const profileForm = useOrganizationProfileForm(profile)
  const updateProfile = useUpdateOrganizationProfile(organizationId)
  const { form } = profileForm
  const { errors, isDirty } = form.formState
  const isPending = updateProfile.isPending
  const ids = {
    name: useId(),
    type: useId(),
    country: useId(),
    currency: useId(),
    size: useId(),
    email: useId(),
    phone: useId(),
    website: useId(),
  }
  const fieldError = (fieldName: keyof UpdateOrganizationProfileInput) =>
    getFieldError<UpdateOrganizationProfileInput>({ fieldName, formErrors: errors, backendError: updateProfile.error })

  // Saved values become the new defaults, so the form is clean again until the next edit
  const handleSubmit = form.handleSubmit((input: UpdateOrganizationProfileInput) => {
    updateProfile.mutate({ organizationId, ...input }, { onSuccess: (saved) => form.reset(toProfileFormValues(saved)) })
  })

  return (
    <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
      <SectionCard title="Details">
        <div className="grid gap-4 px-5 py-5">
          <AuthField
            id={ids.name}
            label="Organization name"
            autoComplete="organization"
            maxLength={ORGANIZATION_NAME_MAX}
            disabled={isPending}
            error={fieldError('name')}
            {...form.register('name')}
          />
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <SelectField id={ids.type} label="Type" disabled={isPending} error={fieldError('type')} {...form.register('type')}>
              {ORGANIZATION_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
            <SelectField id={ids.size} label="Students" hint="Optional" disabled={isPending} {...profileForm.sizeField}>
              <option value="">Choose a range</option>
              {STUDENT_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </SelectField>
            <SelectField id={ids.country} label="Country" disabled={isPending} error={fieldError('country')} {...form.register('country')}>
              {COUNTRIES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {regionNames.of(entry.code)}
                </option>
              ))}
            </SelectField>
            <SelectField id={ids.currency} label="Currency" disabled={isPending} error={fieldError('currency')} {...form.register('currency')}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code} · {currencyNames.of(code)}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Contact">
        <div className="grid gap-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <AuthField
              id={ids.email}
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              disabled={isPending}
              error={fieldError('email')}
              {...form.register('email')}
            />
            <AuthField id={ids.phone} label="Phone" type="tel" autoComplete="tel" disabled={isPending} error={fieldError('phone')} {...form.register('phone')} />
          </div>
          <AuthField
            id={ids.website}
            label="Website"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://"
            disabled={isPending}
            error={fieldError('website')}
            {...form.register('website')}
          />
        </div>
      </SectionCard>

      {updateProfile.isError ? <FormAlert>{getErrorMessage(updateProfile.error)}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={isPending || !isDirty}>
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        {updateProfile.isSuccess && !isDirty ? <FormSuccess>The profile is saved.</FormSuccess> : null}
      </div>
    </form>
  )
}
