import { createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '#/components/AuthShell'
import { useTitle } from '#/lib/use-title'
import { InvitationCard } from '#/modules/members/components/invitation-card'

// Open to everyone: the invitee may not have an account yet
export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  useTitle('Your invitation · Shigjetademy')
  const { token } = Route.useParams()
  return (
    <AuthShell>
      <InvitationCard token={token} />
    </AuthShell>
  )
}
