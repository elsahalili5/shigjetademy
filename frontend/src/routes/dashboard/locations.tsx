import { createFileRoute } from '@tanstack/react-router'
import { requireOrganizationManager } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useManagedMembership } from '#/modules/auth/hooks/use-managed-membership'
import { LocationsPage } from '#/modules/locations/components/locations-page'

// The owner manages locations and departments; school admins read them
export const Route = createFileRoute('/dashboard/locations')({
  beforeLoad: ({ context }) => requireOrganizationManager(context.queryClient),
  component: DashboardLocationsPage,
})

function DashboardLocationsPage() {
  useTitle('Locations and departments · Shigjetademy')
  const managed = useManagedMembership()
  if (!managed) return null
  const { organization } = managed.membership
  return <LocationsPage organizationId={organization.id} organizationName={organization.name} isOwner={managed.isOwner} />
}
