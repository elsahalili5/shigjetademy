import { MessagesSquare } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { requireOrganizationMember } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { ComingSoonPage } from '#/modules/communication/components/coming-soon-page'

export const Route = createFileRoute('/dashboard/discussions')({
  beforeLoad: ({ context }) => requireOrganizationMember(context.queryClient),
  component: DashboardDiscussionsPage,
})

function DashboardDiscussionsPage() {
  useTitle('Groups & Discussions · Shigjetademy')
  return <ComingSoonPage icon={MessagesSquare} title="Groups & Discussions" text="Conversations for whole groups and classes will live here." />
}
