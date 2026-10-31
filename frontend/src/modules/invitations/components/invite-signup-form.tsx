import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import type { RegisterUserInput } from '@shigjetademy/shared/auth'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { SubmitButton } from '#/modules/auth/components/auth-form-parts'
import { useRegister } from '#/modules/auth/hooks/use-register'
import { toInvitePath } from '#/modules/auth/utils/invite-redirect'
import { useInviteSignupForm } from '../hooks/use-invite-signup-form'

interface InviteSignupFormProps {
  token: string
  email: string
  /** Runs once the account exists and its session is stored */
  onRegistered: () => void
}

/** Creates the invited person's account through the normal sign-up endpoint, with the invited email locked */
export function InviteSignupForm({ token, email, onRegistered }: InviteSignupFormProps) {
  const signupForm = useInviteSignupForm(email)
  const register = useRegister()
  const ids = { firstName: useId(), lastName: useId(), email: useId(), password: useId() }
  const { errors } = signupForm.formState

  const handleSubmit = signupForm.handleSubmit(async (input: RegisterUserInput) => {
    try {
      await register.mutateAsync({ ...input, email })
    } catch {
      // The mutation keeps the error, which the form shows below
      return
    }
    // Storing the session swaps this form for the accept step, so the parent finishes the flow
    onRegistered()
  })

  // A server error belongs to the values that were sent; editing them clears it
  const handleEdit = () => {
    if (register.isError) register.reset()
  }

  return (
    <>
      <form className="mt-8 grid gap-4" noValidate onSubmit={handleSubmit} onChange={handleEdit}>
        <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
          <AuthField
            id={ids.firstName}
            label="First name"
            autoComplete="given-name"
            disabled={register.isPending}
            error={getFieldError<RegisterUserInput>({ fieldName: 'first_name', formErrors: errors, backendError: register.error })}
            {...signupForm.register('first_name')}
          />
          <AuthField
            id={ids.lastName}
            label="Last name"
            autoComplete="family-name"
            disabled={register.isPending}
            error={getFieldError<RegisterUserInput>({ fieldName: 'last_name', formErrors: errors, backendError: register.error })}
            {...signupForm.register('last_name')}
          />
        </div>
        <AuthField
          id={ids.email}
          label="Email"
          type="email"
          autoComplete="email"
          readOnly
          error={getFieldError<RegisterUserInput>({ fieldName: 'email', formErrors: errors, backendError: register.error })}
          {...signupForm.register('email')}
        />
        <AuthField
          id={ids.password}
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={register.isPending}
          error={getFieldError<RegisterUserInput>({ fieldName: 'password', formErrors: errors, backendError: register.error })}
          {...signupForm.register('password')}
        />

        {register.isError ? <FormAlert>{getErrorMessage(register.error)}</FormAlert> : null}

        <SubmitButton isPending={register.isPending} label="Create account and join" pendingLabel="Creating your account…" />
      </form>

      <p className="mt-6 text-center text-[1.065rem] text-ink-2">
        Already have an account?{' '}
        <Link to="/login" search={{ redirect: toInvitePath(token) }} className="font-[650] text-green-deep">
          Log in
        </Link>
      </p>
    </>
  )
}
