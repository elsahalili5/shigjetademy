import type { z } from 'zod'
import type { MemberRole } from '@shigjetademy/shared/auth'
import type { announcementParamSchema } from './announcements.schema.ts'

export type { CreateAnnouncementInput, UpdateAnnouncementInput } from '@shigjetademy/shared/announcements'

export type AnnouncementParam = z.infer<typeof announcementParamSchema>

/** Who is asking, in the organization of the path */
export type AnnouncementViewer = {
  membershipId: string
  userId: string
  role: MemberRole
}

/** What an announcement is addressed to, as stored */
export type StoredAudience = {
  audience_kind: 'SCHOOL' | 'ROLE' | 'COURSE' | 'GROUP'
  audience_role: MemberRole | null
  course_id: string | null
  group_id: string | null
}
