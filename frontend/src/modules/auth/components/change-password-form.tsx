import { useId } from 'react'
import { getApiErrorMessage } from '#/lib/api-error-message'
import { useChangePassword } from '../hooks/use-change-password'
import { useChangePasswordForm } from '../hooks/use-change-password-form'
import type { ChangePasswordFormValues } from '../hooks/use-change-password-form'
import { AuthField } from './auth-field'
import { FormAlert } from './auth-form-parts'
import { FormSuccess } from './form-success'

export function ChangePasswordForm() {
  const changePasswordForm = useChangePasswordForm()
  const changePassword = useChangePassword()
  const ids = { current: useId(), next: useId(), confirm: useId() }
  const { errors } = changePasswordForm.formState

  const handleSubmit = changePasswordForm.handleSubmit(({ current_password, new_password }: ChangePasswordFormValues) => {
    changePassword.mutate({ current_password, new_password }, { onSuccess: () => changePasswordForm.reset() })
  })

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit} aria-labelledby="change-password-title">
      <AuthField
        id={ids.current}
        label="Current password"
        type="password"
        autoComplete="current-password"
        disabled={changePassword.isPending}
        error={errors.current_password?.message}
        {...changePasswordForm.register('current_password')}
      />
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <AuthField
          id={ids.next}
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={changePassword.isPending}
          error={errors.new_password?.message}
          {...changePasswordForm.register('new_password')}
        />
        <AuthField
          id={ids.confirm}
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          disabled={changePassword.isPending}
          error={errors.confirm_password?.message}
          {...changePasswordForm.register('confirm_password')}
        />
      </div>

      {changePassword.isError ? <FormAlert>{getApiErrorMessage(changePassword.error, 'We couldn’t change your password. Please try again.')}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Changing…' : 'Change password'}
        </button>
        {changePassword.isSuccess ? <FormSuccess>Password changed. Other devices are logged out.</FormSuccess> : null}
      </div>
    </form>
  )
}
