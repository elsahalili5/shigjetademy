import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationManager } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationManager, isOrganizationOwner } from '#/modules/auth/utils/session-user'
import { LocationsPage } from '#/modules/locations/components/locations-page'

// The owner manages locations and departments; school admins read them
export const Route = createFileRoute('/dashboard/locations')({
  beforeLoad: ({ context }) => requireOrganizationManager(context.queryClient),
  component: DashboardLocationsPage,
})

function DashboardLocationsPage() {
  useTitle('Locations and departments · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization the user doesn't run, here or in another tab, sends them to its home
  if (!membership || !isOrganizationManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <LocationsPage organizationId={organization.id} organizationName={organization.name} isOwner={isOrganizationOwner(membership)} />
}
