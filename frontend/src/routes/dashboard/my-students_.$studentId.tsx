import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationLecturer } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationLecturer } from '#/modules/auth/utils/session-user'
import { StudentDetailPage } from '#/modules/student-roster/components/student-detail-page'

// Its own page, not inside the Students list, which has no outlet; the same people as Students may open it
export const Route = createFileRoute('/dashboard/my-students_/$studentId')({
  beforeLoad: ({ context }) => requireOrganizationLecturer(context.queryClient),
  component: DashboardMyStudentPage,
})

function DashboardMyStudentPage() {
  useTitle('Student · Shigjetademy')
  const { studentId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they aren't a lecturer, here or in another tab, sends them to its home
  if (!membership || !isOrganizationLecturer(membership)) return <Navigate to="/dashboard" />
  return <StudentDetailPage organizationId={membership.organization.id} studentId={studentId} />
}
