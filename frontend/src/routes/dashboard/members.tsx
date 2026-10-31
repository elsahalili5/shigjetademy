import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { getOwnedOrganization } from '#/modules/auth/utils/get-home-path'
import { MembersPage } from '#/modules/members/components/members-page'

// Only the organization's owner manages who has access
export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    if (!user || !getOwnedOrganization(user)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  useTitle('Members · Shigjetademy')
  const auth = useAuth()
  const ownedOrganization = auth.user ? getOwnedOrganization(auth.user) : undefined
  // The route guard already sent anyone without an owned organization away
  if (!ownedOrganization) return null
  return <MembersPage organizationId={ownedOrganization.id} organizationName={ownedOrganization.name} />
}
