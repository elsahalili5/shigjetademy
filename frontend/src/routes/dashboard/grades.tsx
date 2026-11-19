import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { GradesPage } from '#/modules/grades/components/grades-page'
import { isGradesMember } from '#/modules/grades/utils/permissions'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'

// The owner, school admins with Grades, lecturers and students read grades; everyone else goes back to their dashboard. What each may read is decided by the server.
export const Route = createFileRoute('/dashboard/grades')({
  beforeLoad: ({ context }) => {
    if (!isGradesMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardGradesPage,
})

function DashboardGradesPage() {
  useTitle('Grades · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isGradesMember(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's groups
  return <GradesPage key={organization.id} organizationId={organization.id} organizationName={organization.name} isStudent={isOrganizationStudent(membership)} />
}
