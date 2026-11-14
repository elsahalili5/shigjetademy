import type { QueryClient } from '@tanstack/react-query'
import type { AnnouncementDetail, AnnouncementSummary } from '@shigjetademy/shared/announcements'
import { announcementQueryKeys } from './query-keys'

const toSummary = (announcement: AnnouncementDetail): AnnouncementSummary => ({
  id: announcement.id,
  title: announcement.title,
  audience_kind: announcement.audience_kind,
  audience_role: announcement.audience_role,
  course: announcement.course,
  group: announcement.group,
  author: announcement.author,
  status: announcement.status,
  publish_at: announcement.publish_at,
  edited_at: announcement.edited_at,
  is_unread: announcement.is_unread,
  can_manage: announcement.can_manage,
})

type RecordAnnouncementParams = {
  queryClient: QueryClient
  organizationId: string
  announcement: AnnouncementDetail
}

/** Puts an announcement the member just saved into the open detail and the list: in place when it is there, first when it is new, so nothing is fetched again */
export const recordAnnouncement = ({ queryClient, organizationId, announcement }: RecordAnnouncementParams) => {
  queryClient.setQueryData<AnnouncementDetail>(announcementQueryKeys.detail({ organizationId, announcementId: announcement.id }), announcement)
  queryClient.setQueryData<AnnouncementSummary[]>(announcementQueryKeys.list(organizationId), (announcements = []) =>
    announcements.some((item) => item.id === announcement.id)
      ? announcements.map((item) => (item.id === announcement.id ? toSummary(announcement) : item))
      : [toSummary(announcement), ...announcements],
  )
}
