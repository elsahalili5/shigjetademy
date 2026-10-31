import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { getOwnedOrganization } from '#/modules/auth/utils/session-user'
import { OrganizationOverview } from '#/modules/organization/components/organization-overview'

// The owner's landing page; everyone else goes back to their own dashboard home
export const Route = createFileRoute('/dashboard/overview')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    if (!user || !getOwnedOrganization(user)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardOverviewPage,
})

function DashboardOverviewPage() {
  useTitle('Overview · Shigjetademy')
  const auth = useAuth()
  const ownedOrganization = auth.user ? getOwnedOrganization(auth.user) : undefined
  // The route guard already sent anyone without an owned organization away
  if (!ownedOrganization) return null
  return <OrganizationOverview organizationId={ownedOrganization.id} organizationName={ownedOrganization.name} />
}
