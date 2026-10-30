import { createFileRoute } from '@tanstack/react-router'
import { useTitle } from '#/lib/use-title'
import { LoginForm } from '#/modules/auth/components/login-form'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  useTitle('Log in · Shigjetademy')
  return <LoginForm />
}
