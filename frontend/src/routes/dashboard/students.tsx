import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { StudentsPage } from '#/modules/students/components/students-page'
import { isStudentsManager } from '#/modules/students/utils/permissions'

// Only the owner and school admins with Students keep student records; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/students')({
  beforeLoad: ({ context }) => {
    if (!isStudentsManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardStudentsPage,
})

function DashboardStudentsPage() {
  useTitle('Students · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isStudentsManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <StudentsPage organizationId={organization.id} organizationName={organization.name} />
}
