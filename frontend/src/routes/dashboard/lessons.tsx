import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { LessonsPage } from '#/modules/lessons/components/lessons-page'
import { isLessonPlanWriter } from '#/modules/lessons/utils/permissions'

// The owner, admins with MANAGE_COURSES and lecturers plan lessons; everyone else goes back to their dashboard
export const Route = createFileRoute('/dashboard/lessons')({
  beforeLoad: ({ context }) => {
    if (!isLessonPlanWriter(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardLessonsPage,
})

function DashboardLessonsPage() {
  useTitle('Lessons · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isLessonPlanWriter(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  return <LessonsPage organizationId={organization.id} timeZone={organization.time_zone} />
}
