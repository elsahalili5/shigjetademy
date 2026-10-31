import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationOwner } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationOwner } from '#/modules/auth/utils/session-user'
import { MembersPage } from '#/modules/members/components/members-page'

// Only the organization's owner manages who has access
export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: ({ context }) => requireOrganizationOwner(context.queryClient),
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  useTitle('Members · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization the user doesn't own, here or in another tab, sends them to its home
  if (!membership || !isOrganizationOwner(membership)) return <Navigate to="/dashboard" />
  return <MembersPage organizationId={membership.organization.id} organizationName={membership.organization.name} />
}
