import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { StudentDetailPage } from '#/modules/student-roster/components/student-detail-page'
import { isStudentsManager } from '#/modules/students/utils/permissions'

// Its own page, not inside the Students list, which has no outlet; the same people as Students may open it
export const Route = createFileRoute('/dashboard/students_/$studentId')({
  beforeLoad: ({ context }) => {
    if (!isStudentsManager(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardStudentPage,
})

function DashboardStudentPage() {
  useTitle('Student · Shigjetademy')
  const { studentId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isStudentsManager(membership)) return <Navigate to="/dashboard" />
  return <StudentDetailPage organizationId={membership.organization.id} studentId={studentId} viewer="MANAGER" />
}
