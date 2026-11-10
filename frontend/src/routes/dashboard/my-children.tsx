import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationGuardian } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationGuardian } from '#/modules/auth/utils/session-user'
import { MyChildrenPage } from '#/modules/my-children/components/my-children-page'

// A guardian's home in their organization; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/my-children')({
  beforeLoad: ({ context }) => requireOrganizationGuardian(context.queryClient),
  component: DashboardMyChildrenPage,
})

function DashboardMyChildrenPage() {
  useTitle('My children · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a guardian, here or in another tab, sends them to its home
  if (!membership || !isOrganizationGuardian(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <MyChildrenPage organizationId={organization.id} organizationName={organization.name} />
}
