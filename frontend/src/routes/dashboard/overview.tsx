import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationOwner } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationOwner } from '#/modules/auth/utils/session-user'
import { OrganizationOverview } from '#/modules/organization/components/organization-overview'

// The owner's landing page; everyone else goes back to their own dashboard home
export const Route = createFileRoute('/dashboard/overview')({
  beforeLoad: ({ context }) => requireOrganizationOwner(context.queryClient),
  component: DashboardOverviewPage,
})

function DashboardOverviewPage() {
  useTitle('Overview · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization the user doesn't own, here or in another tab, sends them to its home
  if (!membership || !isOrganizationOwner(membership)) return <Navigate to="/dashboard" />
  return <OrganizationOverview organizationId={membership.organization.id} organizationName={membership.organization.name} />
}
