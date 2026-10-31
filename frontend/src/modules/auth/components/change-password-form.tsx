import { useId } from 'react'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useChangePassword } from '../hooks/use-change-password'
import { useChangePasswordForm } from '../hooks/use-change-password-form'
import type { ChangePasswordFormValues } from '../hooks/use-change-password-form'
import { AuthField } from './auth-field'
import { FormSuccess } from './form-success'

export function ChangePasswordForm() {
  const changePasswordForm = useChangePasswordForm()
  const changePassword = useChangePassword()
  const ids = { current: useId(), next: useId(), confirm: useId() }
  const { errors } = changePasswordForm.formState

  const handleSubmit = changePasswordForm.handleSubmit(({ current_password, new_password }: ChangePasswordFormValues) => {
    changePassword.mutate({ current_password, new_password }, { onSuccess: () => changePasswordForm.reset() })
  })

  // A server error belongs to the values that were sent; editing them clears it
  const handleEdit = () => {
    if (changePassword.isError) changePassword.reset()
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit} onChange={handleEdit} aria-labelledby="change-password-title">
      <AuthField
        id={ids.current}
        label="Current password"
        type="password"
        autoComplete="current-password"
        disabled={changePassword.isPending}
        error={getFieldError<ChangePasswordFormValues>({ fieldName: 'current_password', formErrors: errors, backendError: changePassword.error })}
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
          error={getFieldError<ChangePasswordFormValues>({ fieldName: 'new_password', formErrors: errors, backendError: changePassword.error })}
          {...changePasswordForm.register('new_password')}
        />
        <AuthField
          id={ids.confirm}
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          disabled={changePassword.isPending}
          error={getFieldError<ChangePasswordFormValues>({ fieldName: 'confirm_password', formErrors: errors, backendError: changePassword.error })}
          {...changePasswordForm.register('confirm_password')}
        />
      </div>

      {changePassword.isError ? <FormAlert>{getErrorMessage(changePassword.error)}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Changing…' : 'Change password'}
        </button>
        {changePassword.isSuccess ? <FormSuccess>Password changed. Other devices are logged out.</FormSuccess> : null}
      </div>
    </form>
  )
}
