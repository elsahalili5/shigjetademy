import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'
import { TestsPage } from '#/modules/tests/components/tests-page'
import { isTestsMember } from '#/modules/tests/utils/permissions'

// The owner, school admins with Tests, lecturers and students use tests; everyone else goes back to their dashboard. What each may do is decided by the server.
export const Route = createFileRoute('/dashboard/tests')({
  beforeLoad: ({ context }) => {
    if (!isTestsMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardTestsPage,
})

function DashboardTestsPage() {
  useTitle('Tests · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isTestsMember(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's groups
  return <TestsPage key={organization.id} organizationId={organization.id} organizationName={organization.name} timeZone={organization.time_zone} isStudent={isOrganizationStudent(membership)} />
}
