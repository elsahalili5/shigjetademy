import { createFileRoute } from '@tanstack/react-router'
import { useTitle } from '#/lib/use-title'
import { SignupForm } from '#/modules/auth/components/signup-form'

export const Route = createFileRoute('/(auth)/signup')({
  component: SignupPage,
})

function SignupPage() {
  useTitle('Create your account · Shigjetademy')
  return <SignupForm />
}
