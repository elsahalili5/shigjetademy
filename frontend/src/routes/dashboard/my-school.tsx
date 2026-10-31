import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationStudent } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'
import { MySchoolPage } from '#/modules/my-school/components/my-school-page'

// A student's home in their organization; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/my-school')({
  beforeLoad: ({ context }) => requireOrganizationStudent(context.queryClient),
  component: DashboardMySchoolPage,
})

function DashboardMySchoolPage() {
  useTitle('My school · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a student, here or in another tab, sends them to its home
  if (!membership || !isOrganizationStudent(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <MySchoolPage organizationId={organization.id} organizationName={organization.name} />
}
