import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationGuardian } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationGuardian } from '#/modules/auth/utils/session-user'
import { MyChildPage } from '#/modules/my-children/components/my-child-page'

// Its own page, not inside the My children list, which has no outlet; the same people may open it
export const Route = createFileRoute('/dashboard/my-children_/$studentId')({
  beforeLoad: ({ context }) => requireOrganizationGuardian(context.queryClient),
  component: DashboardMyChildPage,
})

function DashboardMyChildPage() {
  useTitle('My child · Shigjetademy')
  const { studentId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a guardian, here or in another tab, sends them to its home
  if (!membership || !isOrganizationGuardian(membership)) return <Navigate to="/dashboard" />
  return <MyChildPage organizationId={membership.organization.id} studentId={studentId} />
}
