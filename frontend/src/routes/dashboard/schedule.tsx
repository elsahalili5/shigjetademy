import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isSchedulesManager } from '#/modules/groups/utils/permissions'
import { SchedulePage } from '#/modules/schedule/components/schedule-page'

// Only the owner and school admins with MANAGE_SCHEDULES plan the week; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/schedule')({
  beforeLoad: ({ context }) => {
    if (!isSchedulesManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardSchedulePage,
})

function DashboardSchedulePage() {
  useTitle('Timetable · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isSchedulesManager(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <SchedulePage organizationId={organization.id} weekStart={organization.week_start} timeZone={organization.time_zone} />
}
