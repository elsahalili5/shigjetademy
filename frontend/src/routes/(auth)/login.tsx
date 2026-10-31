import { createFileRoute } from '@tanstack/react-router'
import { useTitle } from '#/lib/use-title'
import { LoginForm } from '#/modules/auth/components/login-form'
import { readInviteToken, toInvitePath } from '#/modules/auth/utils/invite-redirect'

type LoginSearch = {
  /** Where to go after logging in; only an invite link is kept */
  redirect?: string
}

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const token = readInviteToken(search.redirect)
    return token ? { redirect: toInvitePath(token) } : {}
  },
  component: LoginPage,
})

function LoginPage() {
  useTitle('Log in · Shigjetademy')
  const { redirect } = Route.useSearch()
  return <LoginForm inviteToken={readInviteToken(redirect)} />
}
