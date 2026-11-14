import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationMember } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { AnnouncementsPage } from '#/modules/announcements/components/announcements-page'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'

// Every member of the organization reads announcements; who writes them is decided by their role, and by the server
export const Route = createFileRoute('/dashboard/announcements')({
  beforeLoad: ({ context }) => requireOrganizationMember(context.queryClient),
  component: DashboardAnnouncementsPage,
})

function DashboardAnnouncementsPage() {
  useTitle('Announcements · Shigjetademy')
  const membership = useActiveMembership()
  if (!membership) return <Navigate to="/dashboard" />
  const { organization, role } = membership
  // Keyed by organization, so switching organizations starts from that organization's announcements
  return <AnnouncementsPage key={organization.id} organizationId={organization.id} organizationName={organization.name} role={role} />
}
