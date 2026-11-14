import type { AnnouncementStatus } from '@shigjetademy/shared/announcements'

const CHIP_LABELS = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
} as const satisfies Record<AnnouncementStatus, string>

interface AnnouncementStatusChipProps {
  status: AnnouncementStatus
}

/** Where a draft, scheduled or archived announcement is, for those who manage it */
export function AnnouncementStatusChip({ status }: AnnouncementStatusChipProps) {
  return <span className="flex-none rounded-full bg-mist px-2 py-0.5 text-[0.78rem] font-semibold text-ink-2">{CHIP_LABELS[status]}</span>
}
