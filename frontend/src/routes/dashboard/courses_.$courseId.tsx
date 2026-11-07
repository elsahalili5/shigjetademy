import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { CourseDetailPage } from '#/modules/courses/components/course-detail-page'
import { isCoursesManager } from '#/modules/courses/utils/permissions'

// Its own page, not inside the Courses list, which has no outlet; the same people as Courses may open it
export const Route = createFileRoute('/dashboard/courses_/$courseId')({
  beforeLoad: ({ context }) => {
    if (!isCoursesManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardCoursePage,
})

function DashboardCoursePage() {
  useTitle('Course · Shigjetademy')
  const { courseId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isCoursesManager(membership)) return <Navigate to="/dashboard" />
  return <CourseDetailPage organizationId={membership.organization.id} courseId={courseId} />
}
