import { Megaphone } from 'lucide-react'
import type { AnnouncementSummary } from '@shigjetademy/shared/announcements'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getAudienceLabel } from '../utils/audience-label'
import { AnnouncementStatusChip } from './announcement-status-chip'

interface AnnouncementListProps {
  status: 'pending' | 'error' | 'success'
  announcements?: AnnouncementSummary[]
  selectedId: string | null
  onSelect: (announcementId: string) => void
  onRetry: () => void
}

/** The announcements the member receives or manages, newest first; unread ones carry a dot, and a draft, scheduled or archived one its status */
export function AnnouncementList({ status, announcements, selectedId, onSelect, onRetry }: AnnouncementListProps) {
  const formatDateTime = useFormatDateTime()

  if (status === 'error') return <LoadError what="announcements" onRetry={onRetry} />
  if (!announcements) return <SkeletonRows />
  if (announcements.length === 0) return <EmptyMessage icon={Megaphone} title="No announcements yet." text="Official notices from your school show up here." />
  return (
    <ul aria-label="Announcements">
      {announcements.map((announcement) => {
        const isSelected = announcement.id === selectedId
        const isShownWithStatus = announcement.can_manage && announcement.status !== 'PUBLISHED'
        return (
          <li key={announcement.id} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              className={`grid w-full grid-cols-[minmax(0,1fr)] gap-1 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-mist ${isSelected ? 'bg-green-wash' : ''}`}
              onClick={() => onSelect(announcement.id)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`flex min-w-0 items-center gap-2 ${announcement.is_unread ? 'font-bold' : 'font-semibold'}`}>
                  {announcement.is_unread ? <span className="size-2 flex-none rounded-full bg-green-deep" role="img" aria-label="Unread" /> : null}
                  <span className="truncate" title={announcement.title}>
                    {announcement.title}
                  </span>
                </span>
                {isShownWithStatus ? <AnnouncementStatusChip status={announcement.status} /> : null}
              </span>
              <span className="truncate text-[0.82rem] text-ink-3" title={`${getAudienceLabel(announcement)} · ${fullName(announcement.author)}`}>
                {getAudienceLabel(announcement)} · {fullName(announcement.author)}
              </span>
              <span className="text-[0.82rem] text-ink-3">
                {announcement.publish_at ? <time dateTime={announcement.publish_at}>{formatDateTime(announcement.publish_at)}</time> : 'Not published'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
