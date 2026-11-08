import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { AttendancePage } from '#/modules/attendance/components/attendance-page'
import { isAttendanceTaker } from '#/modules/attendance/utils/permissions'

// The owner, school admins with Attendance and lecturers take registers; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/attendance')({
  beforeLoad: ({ context }) => {
    if (!isAttendanceTaker(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardAttendancePage,
})

function DashboardAttendancePage() {
  useTitle('Attendance · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isAttendanceTaker(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <AttendancePage organizationId={organization.id} timeZone={organization.time_zone} />
}
