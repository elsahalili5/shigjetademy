import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationLecturer } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import { StudentRosterPage } from '#/modules/student-roster/components/student-roster-page'

// A lecturer's own students, in the groups they currently teach; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/my-students')({
  beforeLoad: ({ context }) => requireOrganizationLecturer(context.queryClient),
  component: DashboardMyStudentsPage,
})

function DashboardMyStudentsPage() {
  useTitle('Students · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a lecturer, here or in another tab, sends them to its home
  if (!membership || !isOrganizationLecturer(membership)) return <Navigate to="/dashboard" />
  return <StudentRosterPage organizationId={membership.organization.id} />
}
