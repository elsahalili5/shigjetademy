import { useId } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { LoginUserInput } from '@shigjetademy/shared/auth'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useLogin } from '../hooks/use-login'
import { useLoginForm } from '../hooks/use-login-form'
import { getHomePath } from '../utils/session-user'
import { AuthField } from './auth-field'
import { SubmitButton } from './auth-form-parts'

export function LoginForm() {
  const loginForm = useLoginForm()
  const login = useLogin()
  const navigate = useNavigate()
  const ids = { email: useId(), password: useId() }
  const { errors } = loginForm.formState

  const handleSubmit = loginForm.handleSubmit((input: LoginUserInput) => {
    login.mutate(input, { onSuccess: (session) => void navigate({ to: getHomePath(session.user) }) })
  })

  // A server error belongs to the values that were sent; editing them clears it
  const handleEdit = () => {
    if (login.isError) login.reset()
  }

  return (
    <>
      <h1>Welcome back</h1>
      <p className="mt-2.5 text-ink-2">Log in to run your term in Shigjetademy.</p>

      <form className="mt-8 grid gap-4" noValidate onSubmit={handleSubmit} onChange={handleEdit}>
        <AuthField
          id={ids.email}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@school.edu"
          disabled={login.isPending}
          error={getFieldError<LoginUserInput>({ fieldName: 'email', formErrors: errors, backendError: login.error })}
          {...loginForm.register('email')}
        />
        <AuthField
          id={ids.password}
          label="Password"
          type="password"
          autoComplete="current-password"
          disabled={login.isPending}
          error={getFieldError<LoginUserInput>({ fieldName: 'password', formErrors: errors, backendError: login.error })}
          {...loginForm.register('password')}
        />

        {login.isError ? <FormAlert>{getErrorMessage(login.error)}</FormAlert> : null}

        <SubmitButton isPending={login.isPending} label="Log in" pendingLabel="Logging in…" />
      </form>

      <p className="mt-6 text-center text-[1.065rem] text-ink-2">
        New to Shigjetademy?{' '}
        <Link to="/signup" className="font-[650] text-green-deep">
          Create an account
        </Link>
      </p>
    </>
  )
}
