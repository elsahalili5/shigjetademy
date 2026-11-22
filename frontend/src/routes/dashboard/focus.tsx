import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationStudent } from '#/lib/route-guard'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'
import { FocusPage } from '#/modules/focus/components/focus-page'

// A student's focus timer; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/focus')({
  beforeLoad: ({ context }) => requireOrganizationStudent(context.queryClient),
  component: DashboardFocusPage,
})

function DashboardFocusPage() {
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a student sends them to its home
  if (!membership || !isOrganizationStudent(membership)) return <Navigate to="/dashboard" />
  return <FocusPage />
}
