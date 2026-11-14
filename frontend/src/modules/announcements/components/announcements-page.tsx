import { useRef, useState } from 'react'
import { Megaphone } from 'lucide-react'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { TableAddButton } from '#/components/TableToolbar'
import { useAnnouncements } from '../hooks/use-announcements'
import { AnnouncementDetailPane, NoAnnouncementSelected } from './announcement-detail'
import { AnnouncementFormDialog } from './announcement-form-dialog'
import { AnnouncementList } from './announcement-list'

const WRITER_ROLES: readonly MemberRole[] = ['OWNER', 'ADMIN', 'LECTURER']

interface AnnouncementsPageProps {
  organizationId: string
  organizationName: string
  role: MemberRole
}

/** Official notices: the member's announcements on the left, the open one on the right (below it on narrow screens) */
export function AnnouncementsPage({ organizationId, organizationName, role }: AnnouncementsPageProps) {
  const announcements = useAnnouncements(organizationId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canWrite = WRITER_ROLES.includes(role)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Megaphone} title="Announcements" subtitle={`${organizationName} · official notices`} />
      {canWrite ? (
        <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
          <TableAddButton label="New announcement" onClick={() => dialogRef.current?.showModal()} />
        </div>
      ) : null}
      <div className="grid flex-1 grid-cols-[minmax(260px,360px)_minmax(0,1fr)] items-stretch px-[clamp(20px,3.4vw,44px)] pb-10 max-[1000px]:grid-cols-1">
        <section className="min-h-[320px] overflow-hidden rounded-l-card border border-rule max-[1000px]:rounded-card" aria-label="Your announcements">
          <AnnouncementList status={announcements.status} announcements={announcements.data} selectedId={selectedId} onSelect={setSelectedId} onRetry={() => void announcements.refetch()} />
        </section>
        <section className="flex min-h-[420px] min-w-0 flex-col rounded-r-card border border-l-0 border-rule max-[1000px]:mt-4 max-[1000px]:rounded-card max-[1000px]:border-l" aria-label="Announcement">
          {selectedId ? <AnnouncementDetailPane key={selectedId} organizationId={organizationId} announcementId={selectedId} /> : <NoAnnouncementSelected />}
        </section>
      </div>
      {canWrite ? <AnnouncementFormDialog dialogRef={dialogRef} organizationId={organizationId} onSaved={setSelectedId} /> : null}
    </div>
  )
}
