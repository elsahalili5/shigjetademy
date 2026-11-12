import { Megaphone } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { requireOrganizationMember } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { ComingSoonPage } from '#/modules/communication/components/coming-soon-page'

export const Route = createFileRoute('/dashboard/announcements')({
  beforeLoad: ({ context }) => requireOrganizationMember(context.queryClient),
  component: DashboardAnnouncementsPage,
})

function DashboardAnnouncementsPage() {
  useTitle('Announcements · Shigjetademy')
  return <ComingSoonPage icon={Megaphone} title="Announcements" text="School-wide news and reminders will be posted here." />
}
