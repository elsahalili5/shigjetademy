import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { PerformancePage } from '#/modules/performance/components/performance-page'
import { isReportsMember } from '#/modules/performance/utils/permissions'
import { validateReportSearch } from '#/modules/performance/utils/report-search'
import type { ReportSearch } from '#/modules/performance/utils/report-search'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'

// The owner, school admins with Grades and lecturers read reports; everyone else goes back to their dashboard. Which groups each reaches is decided by the server.
export const Route = createFileRoute('/dashboard/performance')({
  validateSearch: validateReportSearch,
  beforeLoad: ({ context }) => {
    if (!isReportsMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardPerformancePage,
})

function DashboardPerformancePage() {
  useTitle('Reports · Shigjetademy')
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const membership = useActiveMembership()

  const handleSearchChange = (next: ReportSearch) => void navigate({ search: next })

  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isReportsMember(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's current term
  return <PerformancePage key={organization.id} organizationId={organization.id} organizationName={organization.name} search={search} onSearchChange={handleSearchChange} />
}
