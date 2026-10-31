import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationOwner } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationOwner } from '#/modules/auth/utils/session-user'
import { OrganizationSettingsPage } from '#/modules/organization-settings/components/organization-settings-page'

// Settings that control how the whole organization runs are the owner's alone
export const Route = createFileRoute('/dashboard/organization-settings')({
  beforeLoad: ({ context }) => requireOrganizationOwner(context.queryClient),
  component: DashboardOrganizationSettingsPage,
})

function DashboardOrganizationSettingsPage() {
  useTitle('Organization settings · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization the user doesn't own, here or in another tab, sends them to its home
  if (!membership || !isOrganizationOwner(membership)) return <Navigate to="/dashboard" />
  return <OrganizationSettingsPage organization={membership.organization} />
}
