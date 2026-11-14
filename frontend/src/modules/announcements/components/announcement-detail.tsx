import { useRef, useState } from 'react'
import { Archive, CalendarClock, Megaphone, Pencil, UserRound, Users } from 'lucide-react'
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
      <header className="grid gap-3 border-b border-rule px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 id="announcement-title" className="min-w-0 flex-1 text-[1.35rem] leading-tight font-[680] tracking-[-0.02em] break-words">
            {announcement.title}
          </h2>
          {announcement.can_manage && announcement.status !== 'PUBLISHED' ? <AnnouncementStatusChip status={announcement.status} /> : null}
        </div>
        <ul aria-label="About this announcement" className="flex flex-wrap items-center gap-2 text-[0.88rem]">
          <li className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-green-wash px-3 py-1 font-semibold text-green-deep">
            <Users className="flex-none" size={14} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">To</span>
            <span className="truncate">{getAudienceLabel(announcement)}</span>
          </li>
          <li className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-2 ring-1 ring-rule">
            <UserRound className="flex-none text-ink-3" size={14} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">From</span>
            <span className="truncate">{fullName(announcement.author)}</span>
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-2 ring-1 ring-rule">
            <CalendarClock className="flex-none text-ink-3" size={14} strokeWidth={2} aria-hidden="true" />
            <span className="text-ink-3">{announcement.status === 'SCHEDULED' ? 'Goes out' : 'Published'}</span>
            {announcement.publish_at ? <time dateTime={announcement.publish_at}>{formatDateTime(announcement.publish_at)}</time> : <span>Not yet</span>}
          </li>
          {announcement.edited_at ? (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-2 ring-1 ring-rule">
              <Pencil className="flex-none text-ink-3" size={14} strokeWidth={2} aria-hidden="true" />
              <span className="text-ink-3">Edited</span>
              <time dateTime={announcement.edited_at}>{formatDateTime(announcement.edited_at)}</time>
            </li>
          ) : null}
        </ul>
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
