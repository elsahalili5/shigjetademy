import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { MembersPage } from '#/modules/members/components/members-page'

// Only the organization's owner manages who has access
export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    const isOwner = user?.memberships.some((membership) => membership.role === 'OWNER') ?? false
    if (!isOwner) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  useTitle('Members · Shigjetademy')
  const auth = useAuth()
  const ownedOrganization = auth.user?.memberships.find((membership) => membership.role === 'OWNER')?.organization
  // The route guard already sent anyone without an owned organization away
  if (!ownedOrganization) return null
  return <MembersPage organizationId={ownedOrganization.id} organizationName={ownedOrganization.name} />
}
