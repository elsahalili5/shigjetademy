import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useTitle } from '#/lib/use-title'
import { AcademicPeriodsPage } from '#/modules/academic-periods/components/academic-periods-page'
import { isAcademicPeriodsManager } from '#/modules/academic-periods/utils/permissions'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'

// Every member of the organization reads its calendar; the owner and permitted school admins change it
export const Route = createFileRoute('/dashboard/academic-periods')({
  component: DashboardAcademicPeriodsPage,
})

function DashboardAcademicPeriodsPage() {
  useTitle('Academic periods · Shigjetademy')
  const membership = useActiveMembership()
  // The platform admin belongs to no organization, so they go back to their dashboard
  if (!membership) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <AcademicPeriodsPage organizationId={organization.id} organizationName={organization.name} isEditable={isAcademicPeriodsManager(membership)} />
}
