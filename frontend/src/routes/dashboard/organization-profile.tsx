import { createFileRoute } from '@tanstack/react-router'
import { requireOrganizationManager } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useManagedMembership } from '#/modules/auth/hooks/use-managed-membership'
import { OrganizationProfilePage } from '#/modules/organization/components/organization-profile-page'

// The owner edits the profile; school admins read it
export const Route = createFileRoute('/dashboard/organization-profile')({
  beforeLoad: ({ context }) => requireOrganizationManager(context.queryClient),
  component: DashboardOrganizationProfilePage,
})

function DashboardOrganizationProfilePage() {
  useTitle('Organization profile · Shigjetademy')
  const managed = useManagedMembership()
  if (!managed) return null
  const { organization } = managed.membership
  return <OrganizationProfilePage organizationId={organization.id} organizationName={organization.name} isOwner={managed.isOwner} />
}
