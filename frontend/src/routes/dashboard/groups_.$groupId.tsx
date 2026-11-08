import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isGroupsReader } from '#/modules/groups/utils/permissions'
import { GroupDetailPage } from '#/modules/groups/components/group-detail-page'

// Its own page, not inside the Groups list, which has no outlet; the same people as Groups may open it
export const Route = createFileRoute('/dashboard/groups_/$groupId')({
  beforeLoad: ({ context }) => {
    if (!isGroupsReader(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardGroupPage,
})

function DashboardGroupPage() {
  useTitle('Group · Shigjetademy')
  const { groupId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isGroupsReader(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <GroupDetailPage organizationId={organization.id} groupId={groupId} timeZone={organization.time_zone} />
}
