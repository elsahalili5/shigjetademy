import { createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '#/components/AuthShell'
import { useTitle } from '#/lib/use-title'
import { InvitePage } from '#/modules/invitations/components/invite-page'

// Public: anyone with the link reads the invitation; the page itself asks for an account before accepting
export const Route = createFileRoute('/invite/$token')({
  component: InviteRoute,
})

function InviteRoute() {
  useTitle('Your invitation · Shigjetademy')
  const { token } = Route.useParams()
  return (
    <AuthShell>
      <InvitePage token={token} />
    </AuthShell>
  )
}
