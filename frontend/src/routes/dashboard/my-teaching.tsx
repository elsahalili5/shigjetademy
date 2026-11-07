import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationLecturer } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import { MyTeachingPage } from '#/modules/my-teaching/components/my-teaching-page'

// A lecturer's home in their organization; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/my-teaching')({
  beforeLoad: ({ context }) => requireOrganizationLecturer(context.queryClient),
  component: DashboardMyTeachingPage,
})

function DashboardMyTeachingPage() {
  useTitle('My teaching · Shigjetademy')
  const auth = useAuth()
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a lecturer, here or in another tab, sends them to its home
  if (!membership || !isOrganizationLecturer(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <MyTeachingPage organizationId={organization.id} organizationName={organization.name} firstName={auth.user?.first_name ?? ''} timeZone={organization.time_zone} />
}
