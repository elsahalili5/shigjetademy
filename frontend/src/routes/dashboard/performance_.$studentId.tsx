import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { StudentReportPage } from '#/modules/performance/components/student-report-page'
import { isReportsMember } from '#/modules/performance/utils/permissions'
import { validateReportSearch } from '#/modules/performance/utils/report-search'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'

// Its own page, not inside Reports, which has no outlet; the same people as Reports may open it
export const Route = createFileRoute('/dashboard/performance_/$studentId')({
  // The term the report covers, and the group to go back to; without a term, the server picks the one that holds today
  validateSearch: validateReportSearch,
  beforeLoad: ({ context }) => {
    if (!isReportsMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardStudentReportPage,
})

function DashboardStudentReportPage() {
  useTitle('Student report · Shigjetademy')
  const { studentId } = Route.useParams()
  const search = Route.useSearch()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isReportsMember(membership)) return <Navigate to="/dashboard" />
  return <StudentReportPage key={membership.organization.id} organizationId={membership.organization.id} studentId={studentId} search={search} />
}
