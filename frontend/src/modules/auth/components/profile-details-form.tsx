import { useId } from 'react'
import type { AuthUser, UpdateProfileInput } from '@shigjetademy/shared/auth'
import { getApiErrorMessage } from '#/lib/api-error-message'
import { useProfileForm } from '../hooks/use-profile-form'
import { useUpdateProfile } from '../hooks/use-update-profile'
import { AuthField } from './auth-field'
import { FormAlert } from './auth-form-parts'
import { FormSuccess } from './form-success'

interface ProfileDetailsFormProps {
  user: AuthUser
}

export function ProfileDetailsForm({ user }: ProfileDetailsFormProps) {
  const profileForm = useProfileForm(user)
  const updateProfile = useUpdateProfile()
  const ids = { firstName: useId(), lastName: useId(), email: useId() }
  const { errors, isDirty } = profileForm.formState

  // Saved values become the new defaults, so the form is clean again until the next edit
  const handleSubmit = profileForm.handleSubmit((input: UpdateProfileInput) => {
    updateProfile.mutate(input, { onSuccess: (saved) => profileForm.reset({ first_name: saved.first_name, last_name: saved.last_name, email: saved.email }) })
  })

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit} aria-labelledby="profile-details-title">
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <AuthField
          id={ids.firstName}
          label="First name"
          autoComplete="given-name"
          disabled={updateProfile.isPending}
          error={errors.first_name?.message}
          {...profileForm.register('first_name')}
        />
        <AuthField
          id={ids.lastName}
          label="Last name"
          autoComplete="family-name"
          disabled={updateProfile.isPending}
          error={errors.last_name?.message}
          {...profileForm.register('last_name')}
        />
      </div>
      <AuthField
        id={ids.email}
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        disabled={updateProfile.isPending}
        error={errors.email?.message}
        {...profileForm.register('email')}
      />

      {updateProfile.isError ? <FormAlert>{getApiErrorMessage(updateProfile.error, 'We couldn’t save your details. Please try again.')}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={updateProfile.isPending || !isDirty}>
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </button>
        {updateProfile.isSuccess && !isDirty ? <FormSuccess>Your details are saved.</FormSuccess> : null}
      </div>
    </form>
  )
}
