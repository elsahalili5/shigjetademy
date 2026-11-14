import { useRef, useState } from 'react'
import { Archive, Megaphone, Pencil } from 'lucide-react'
import type { AnnouncementDetail } from '@shigjetademy/shared/announcements'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { getErrorMessage } from '#/lib/error-message'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useAnnouncement } from '../hooks/use-announcement'
import { useArchiveAnnouncement } from '../hooks/use-archive-announcement'
import { getAudienceLabel } from '../utils/audience-label'
import { AnnouncementFormDialog } from './announcement-form-dialog'
import { AnnouncementStatusChip } from './announcement-status-chip'

interface AnnouncementDetailPaneProps {
  organizationId: string
  announcementId: string
}

/** One open announcement: the notice itself, and for those who manage it who read it and how to edit or archive it */
export function AnnouncementDetailPane({ organizationId, announcementId }: AnnouncementDetailPaneProps) {
  const announcement = useAnnouncement({ organizationId, announcementId })

  if (announcement.status === 'error') return <LoadError what="announcement" onRetry={() => void announcement.refetch()} />
  if (!announcement.data) return <DetailSkeleton />
  return <LoadedAnnouncement organizationId={organizationId} announcement={announcement.data} />
}

interface LoadedAnnouncementProps {
  organizationId: string
  announcement: AnnouncementDetail
}

function LoadedAnnouncement({ organizationId, announcement }: LoadedAnnouncementProps) {
  const formatDateTime = useFormatDateTime()
  const archiveAnnouncement = useArchiveAnnouncement(organizationId)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false)
  const isEditable = announcement.can_manage && announcement.status !== 'ARCHIVED'

  const handleArchive = () =>
    archiveAnnouncement.mutate(announcement.id, { onSettled: () => setIsConfirmingArchive(false) })

  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-labelledby="announcement-title">
      <header className="grid gap-2 border-b border-rule px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="announcement-title" className="min-w-0 text-[1.3rem] leading-tight font-[680] break-words">
            {announcement.title}
          </h2>
          {announcement.can_manage && announcement.status !== 'PUBLISHED' ? <AnnouncementStatusChip status={announcement.status} /> : null}
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-[0.93rem] text-ink-2 sm:grid-cols-2">
          <div className="flex gap-1.5">
            <dt className="text-ink-3">From</dt>
            <dd>{fullName(announcement.author)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">To</dt>
            <dd>{getAudienceLabel(announcement)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">{announcement.status === 'SCHEDULED' ? 'Goes out' : 'Published'}</dt>
            <dd>{announcement.publish_at ? <time dateTime={announcement.publish_at}>{formatDateTime(announcement.publish_at)}</time> : 'Not yet'}</dd>
          </div>
          {announcement.edited_at ? (
            <div className="flex gap-1.5">
              <dt className="text-ink-3">Edited</dt>
              <dd>
                <time dateTime={announcement.edited_at}>{formatDateTime(announcement.edited_at)}</time>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="min-h-[200px] flex-1 overflow-y-auto px-5 py-5">
        <p className="whitespace-pre-wrap break-words">{announcement.body}</p>
      </div>

      {announcement.read_counts || isEditable ? (
        <footer className="grid gap-3 border-t border-rule px-5 py-4">
          {announcement.read_counts ? (
            <p className="text-[0.95rem] text-ink-2">
              Read by {announcement.read_counts.read_count} of {announcement.read_counts.audience_size}
            </p>
          ) : null}
          {archiveAnnouncement.isError ? <FormAlert>{getErrorMessage(archiveAnnouncement.error)}</FormAlert> : null}
          {isEditable ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" className="button button--ghost min-h-10 px-3.5 text-[0.95rem]" onClick={() => editDialogRef.current?.showModal()}>
                <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                Edit
              </button>
              {isConfirmingArchive ? (
                <ConfirmGroup label="Archive this announcement" question="Hide it from everyone it was sent to?" confirmLabel="Archive" onConfirm={handleArchive} onCancel={() => setIsConfirmingArchive(false)} />
              ) : (
                <button type="button" className="button button--ghost min-h-10 px-3.5 text-[0.95rem]" onClick={() => setIsConfirmingArchive(true)}>
                  <Archive size={16} strokeWidth={2} aria-hidden="true" />
                  Archive
                </button>
              )}
            </div>
          ) : null}
        </footer>
      ) : null}
      {isEditable ? <AnnouncementFormDialog dialogRef={editDialogRef} organizationId={organizationId} announcement={announcement} onSaved={() => undefined} /> : null}
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid flex-1 content-start gap-4 px-5 py-5" aria-busy="true" aria-label="Loading">
      <span className="h-6 w-2/3 animate-pulse rounded bg-mist" aria-hidden="true" />
      <span className="h-4 w-1/2 animate-pulse rounded bg-mist" aria-hidden="true" />
      <span className="h-24 w-full animate-pulse rounded-2xl bg-mist" aria-hidden="true" />
    </div>
  )
}

/** What the detail side shows before an announcement is picked */
export function NoAnnouncementSelected() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-2 px-5 py-16 text-center text-ink-2">
      <Megaphone className="text-ink-3" size={26} strokeWidth={1.6} aria-hidden="true" />
      <p className="font-semibold text-ink">Pick an announcement</p>
      <p>Choose one on the left to read it.</p>
    </div>
  )
}
