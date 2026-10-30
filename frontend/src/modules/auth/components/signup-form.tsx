import { useId } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { RegisterUserInput } from '@shigjetademy/shared/auth'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useRegister } from '../hooks/use-register'
import { useRegisterForm } from '../hooks/use-register-form'
import { AuthField } from './auth-field'
import { SubmitButton } from './auth-form-parts'

/** Sign-up for education providers: the account comes first, the organization is the next step */
export function SignupForm() {
  const registerForm = useRegisterForm()
  const register = useRegister()
  const navigate = useNavigate()
  const ids = { firstName: useId(), lastName: useId(), email: useId(), password: useId() }
  const { errors } = registerForm.formState

  const handleSubmit = registerForm.handleSubmit((input: RegisterUserInput) => {
    register.mutate(input, { onSuccess: () => void navigate({ to: '/onboarding' }) })
  })

  return (
    <>
      <p className="font-data text-[0.807rem] tracking-[0.06em] text-ink-3 uppercase">Step 1 of 2 · Your account</p>
      <h1 className="mt-3">Create your account</h1>
      <p className="mt-2.5 text-ink-2">For schools, kindergartens, academies and lecturers. Your team joins later by invitation.</p>

      <form className="mt-8 grid gap-4" noValidate onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
          <AuthField
            id={ids.firstName}
            label="First name"
            autoComplete="given-name"
            disabled={register.isPending}
            error={getFieldError<RegisterUserInput>({ fieldName: 'first_name', formErrors: errors, backendError: register.error })}
            {...registerForm.register('first_name')}
          />
          <AuthField
            id={ids.lastName}
            label="Last name"
            autoComplete="family-name"
            disabled={register.isPending}
            error={getFieldError<RegisterUserInput>({ fieldName: 'last_name', formErrors: errors, backendError: register.error })}
            {...registerForm.register('last_name')}
          />
        </div>
        <AuthField
          id={ids.email}
          label="Work email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@school.edu"
          disabled={register.isPending}
          error={getFieldError<RegisterUserInput>({ fieldName: 'email', formErrors: errors, backendError: register.error })}
          {...registerForm.register('email')}
        />
        <AuthField
          id={ids.password}
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={register.isPending}
          error={getFieldError<RegisterUserInput>({ fieldName: 'password', formErrors: errors, backendError: register.error })}
          {...registerForm.register('password')}
        />

        {register.isError ? <FormAlert>{getErrorMessage(register.error)}</FormAlert> : null}

        <SubmitButton isPending={register.isPending} label="Create account" pendingLabel="Creating your account…" />
      </form>

      <p className="mt-6 text-center text-[1.065rem] text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-[650] text-green-deep">
          Log in
        </Link>
      </p>
    </>
  )
}
