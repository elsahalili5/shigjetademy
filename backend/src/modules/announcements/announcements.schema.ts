import { z } from 'zod'

export { createAnnouncementSchema, updateAnnouncementSchema } from '@shigjetademy/shared/announcements'

export const announcementParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  announcementId: z.uuid('Invalid announcement id'),
})
