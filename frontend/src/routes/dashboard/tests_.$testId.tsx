import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { isOrganizationStudent } from '#/modules/auth/utils/session-user'
import { TestSheetPage } from '#/modules/tests/components/test-sheet-page'
import { isTestsMember } from '#/modules/tests/utils/permissions'

// Its own page, not inside the Tests list, which has no outlet; the group's setters open it to record results, and students see theirs on the list instead
export const Route = createFileRoute('/dashboard/tests_/$testId')({
  beforeLoad: ({ context }) => {
    const membership = getSessionMembership(context.queryClient)
    if (!isTestsMember(membership) || isOrganizationStudent(membership)) {
      throw redirect({ to: '/dashboard/tests' })
    }
  },
  component: DashboardTestPage,
})

function DashboardTestPage() {
  useTitle('Test · Shigjetademy')
  const { testId } = Route.useParams()
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its tests or its home
  if (!membership || !isTestsMember(membership)) return <Navigate to="/dashboard" />
  if (isOrganizationStudent(membership)) return <Navigate to="/dashboard/tests" />
  return <TestSheetPage organizationId={membership.organization.id} testId={testId} />
}
