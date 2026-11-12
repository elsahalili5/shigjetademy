import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationGuardian } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationGuardian } from '#/modules/auth/utils/session-user'
import { MyNotesPage } from '#/modules/my-children/components/my-notes-page'

// The notes teachers wrote to a guardian about their children; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/my-notes')({
  beforeLoad: ({ context }) => requireOrganizationGuardian(context.queryClient),
  component: DashboardMyNotesPage,
})

function DashboardMyNotesPage() {
  useTitle('Notes · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a guardian, here or in another tab, sends them to its home
  if (!membership || !isOrganizationGuardian(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <MyNotesPage organizationId={organization.id} organizationName={organization.name} />
}
