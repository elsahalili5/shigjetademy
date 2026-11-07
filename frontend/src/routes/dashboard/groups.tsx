import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isCoursesManager } from '#/modules/courses/utils/permissions'
import { GroupsPage } from '#/modules/groups/components/groups-page'

// Only the owner and school admins with Courses and groups keep groups; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/groups')({
  beforeLoad: ({ context }) => {
    if (!isCoursesManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardGroupsPage,
})

function DashboardGroupsPage() {
  useTitle('Groups · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isCoursesManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <GroupsPage organizationId={organization.id} organizationName={organization.name} />
}
