import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationMemberExceptGuardian } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationGuardian } from '#/modules/auth/utils/session-user'
import { DiscussionsPage } from '#/modules/discussions/components/discussions-page'

// Owner, admins, lecturers and students take part in discussions; guardians don't and go back to their dashboard. What each may do is decided by the server.
export const Route = createFileRoute('/dashboard/discussions')({
  beforeLoad: ({ context }) => requireOrganizationMemberExceptGuardian(context.queryClient),
  component: DashboardDiscussionsPage,
})

function DashboardDiscussionsPage() {
  useTitle('Groups & Discussions · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they are a guardian, here or in another tab, sends them to its home
  if (!membership || isOrganizationGuardian(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's topics
  return <DiscussionsPage key={organization.id} organizationId={organization.id} organizationName={organization.name} />
}
