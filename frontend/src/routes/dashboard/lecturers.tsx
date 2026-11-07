import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { LecturersPage } from '#/modules/lecturers/components/lecturers-page'
import { isLecturersManager } from '#/modules/lecturers/utils/permissions'

// Only the owner and school admins with Lecturers keep lecturer records; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/lecturers')({
  beforeLoad: ({ context }) => {
    if (!isLecturersManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardLecturersPage,
})

function DashboardLecturersPage() {
  useTitle('Lecturers · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isLecturersManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <LecturersPage organizationId={organization.id} organizationName={organization.name} />
}
