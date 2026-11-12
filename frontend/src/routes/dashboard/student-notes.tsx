import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationLecturer } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import { ParentNotesPage } from '#/modules/parent-notes/components/parent-notes-page'

// A lecturer's notes to the parents of their students; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/student-notes')({
  beforeLoad: ({ context }) => requireOrganizationLecturer(context.queryClient),
  component: DashboardStudentNotesPage,
})

function DashboardStudentNotesPage() {
  useTitle('Student notes · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a lecturer, here or in another tab, sends them to its home
  if (!membership || !isOrganizationLecturer(membership)) return <Navigate to="/dashboard" />
  return <ParentNotesPage organizationId={membership.organization.id} />
}
