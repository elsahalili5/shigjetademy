import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isGroupsReader } from '#/modules/groups/utils/permissions'
import { GroupsPage } from '#/modules/groups/components/groups-page'

// The owner and school admins with Courses and groups keep groups, and those with Timetable read them; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/groups')({
  beforeLoad: ({ context }) => {
    if (!isGroupsReader(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardGroupsPage,
})

function DashboardGroupsPage() {
  useTitle('Groups · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isGroupsReader(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <GroupsPage organizationId={organization.id} organizationName={organization.name} timeZone={organization.time_zone} />
}
