import { apiClient } from '#/api/client'
import type { AnnouncementAudienceOptions, AnnouncementDetail, AnnouncementSummary, AnnouncementUnreadCount, CreateAnnouncementInput, UpdateAnnouncementInput } from '@shigjetademy/shared/announcements'

type AnnouncementParams = {
  organizationId: string
  announcementId: string
}

type CreateParams = CreateAnnouncementInput & {
  organizationId: string
}

type UpdateParams = UpdateAnnouncementInput & AnnouncementParams

const announcementsPath = (organizationId: string) => `/organizations/${organizationId}/announcements`

export const announcementsApi = {
  list: (organizationId: string) => apiClient.get<AnnouncementSummary[]>(announcementsPath(organizationId)),
  get: ({ organizationId, announcementId }: AnnouncementParams) => apiClient.get<AnnouncementDetail>(`${announcementsPath(organizationId)}/${announcementId}`),
  getAudienceOptions: (organizationId: string) => apiClient.get<AnnouncementAudienceOptions>(`${announcementsPath(organizationId)}/audiences`),
  getUnreadCount: (organizationId: string) => apiClient.get<AnnouncementUnreadCount>(`${announcementsPath(organizationId)}/unread-count`),
  create: ({ organizationId, ...input }: CreateParams) => apiClient.post<AnnouncementDetail, CreateAnnouncementInput>(announcementsPath(organizationId), input),
  update: ({ organizationId, announcementId, ...input }: UpdateParams) =>
    apiClient.put<AnnouncementDetail, UpdateAnnouncementInput>(`${announcementsPath(organizationId)}/${announcementId}`, input),
  archive: ({ organizationId, announcementId }: AnnouncementParams) => apiClient.post<AnnouncementDetail>(`${announcementsPath(organizationId)}/${announcementId}/archive`),
}
