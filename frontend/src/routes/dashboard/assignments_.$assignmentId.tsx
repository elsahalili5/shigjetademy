import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { AssignmentDetailPage } from '#/modules/assignments/components/assignment-detail-page'
import { isAssignmentsMember } from '#/modules/assignments/utils/permissions'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'

// Its own page, not inside the Assignments list, which has no outlet; the group's setters open it, and students see their hand-ins on the list instead
export const Route = createFileRoute('/dashboard/assignments_/$assignmentId')({
  beforeLoad: ({ context }) => {
    const membership = getSessionMembership(context.queryClient)
    if (!isAssignmentsMember(membership) || isOrganizationStudent(membership)) {
      throw redirect({ to: '/dashboard/assignments' })
    }
  },
  component: DashboardAssignmentPage,
})

function DashboardAssignmentPage() {
  useTitle('Assignment · Shigjetademy')
  const { assignmentId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its assignments or its home
  if (!membership || !isAssignmentsMember(membership)) return <Navigate to="/dashboard" />
  if (isOrganizationStudent(membership)) return <Navigate to="/dashboard/assignments" />
  return <AssignmentDetailPage organizationId={membership.organization.id} assignmentId={assignmentId} />
}
