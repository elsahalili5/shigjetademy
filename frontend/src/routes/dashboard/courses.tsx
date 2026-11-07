import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { CoursesPage } from '#/modules/courses/components/courses-page'
import { isCoursesManager } from '#/modules/courses/utils/permissions'

// Only the owner and school admins with Courses and groups keep courses; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/courses')({
  beforeLoad: ({ context }) => {
    if (!isCoursesManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardCoursesPage,
})

function DashboardCoursesPage() {
  useTitle('Courses · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isCoursesManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <CoursesPage organizationId={organization.id} organizationName={organization.name} />
}
