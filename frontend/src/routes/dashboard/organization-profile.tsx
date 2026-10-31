import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationManager } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationManager, isOrganizationOwner } from '#/modules/auth/utils/session-user'
import { OrganizationProfilePage } from '#/modules/organization/components/organization-profile-page'

// The owner edits the profile; school admins read it
export const Route = createFileRoute('/dashboard/organization-profile')({
  beforeLoad: ({ context }) => requireOrganizationManager(context.queryClient),
  component: DashboardOrganizationProfilePage,
})

function DashboardOrganizationProfilePage() {
  useTitle('Organization profile · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization the user doesn't run, here or in another tab, sends them to its home
  if (!membership || !isOrganizationManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <OrganizationProfilePage organizationId={organization.id} organizationName={organization.name} isOwner={isOrganizationOwner(membership)} />
}
