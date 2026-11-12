import { Navigate, createFileRoute } from '@tanstack/react-router'
import { requireOrganizationMember } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { InboxPage } from '#/modules/inbox/components/inbox-page'

// Every member of the organization has an inbox
export const Route = createFileRoute('/dashboard/inbox')({
  beforeLoad: ({ context }) => requireOrganizationMember(context.queryClient),
  component: DashboardInboxPage,
})

function DashboardInboxPage() {
  useTitle('Inbox · Shigjetademy')
  const membership = useActiveMembership()
  if (!membership) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's conversations
  return <InboxPage key={organization.id} organizationId={organization.id} organizationName={organization.name} />
}
