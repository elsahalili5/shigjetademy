import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { AssignmentsPage } from '#/modules/assignments/components/assignments-page'
import { isAssignmentsMember } from '#/modules/assignments/utils/permissions'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'

// The owner, school admins with Grades, lecturers and students use assignments; everyone else goes back to their dashboard. What each may do is decided by the server.
export const Route = createFileRoute('/dashboard/assignments')({
  beforeLoad: ({ context }) => {
    if (!isAssignmentsMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardAssignmentsPage,
})

function DashboardAssignmentsPage() {
  useTitle('Assignments · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isAssignmentsMember(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's groups
  return <AssignmentsPage key={organization.id} organizationId={organization.id} organizationName={organization.name} timeZone={organization.time_zone} isStudent={isOrganizationStudent(membership)} />
}
