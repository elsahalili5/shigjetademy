// Announcements: official one-way notices. The form and the endpoints that store them share these schemas and response shapes.
import { z } from 'zod'

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 150

export const ANNOUNCEMENT_BODY_MAX_LENGTH = 5000

export const ANNOUNCEMENT_AUDIENCE_KINDS = ['SCHOOL', 'ROLE', 'COURSE', 'GROUP'] as const

export type AnnouncementAudienceKind = (typeof ANNOUNCEMENT_AUDIENCE_KINDS)[number]

/** The roles an announcement can be addressed to as a whole; staff are reached through the whole school */
export const ANNOUNCEMENT_AUDIENCE_ROLES = ['STUDENT', 'GUARDIAN', 'LECTURER'] as const

export type AnnouncementAudienceRole = (typeof ANNOUNCEMENT_AUDIENCE_ROLES)[number]

/** What a saved announcement does: stay a draft, go out now, or go out at a later time */
export const ANNOUNCEMENT_PUBLISH_MODES = ['DRAFT', 'NOW', 'SCHEDULED'] as const

export type AnnouncementPublishMode = (typeof ANNOUNCEMENT_PUBLISH_MODES)[number]

/** Where an announcement is. SCHEDULED turns into PUBLISHED by itself: the server reports PUBLISHED once the publish time has passed */
export const ANNOUNCEMENT_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

const titleSchema = z.string().trim().min(1, 'Write a title.').max(ANNOUNCEMENT_TITLE_MAX_LENGTH, `Keep the title under ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters.`)

const bodySchema = z.string().trim().min(1, 'Write a message.').max(ANNOUNCEMENT_BODY_MAX_LENGTH, `Keep the message under ${ANNOUNCEMENT_BODY_MAX_LENGTH} characters.`)

/** The words of an announcement: a trimmed title and message, never empty */
export const announcementTextSchema = z.object({ title: titleSchema, body: bodySchema })

const announcementFieldsSchema = announcementTextSchema.extend({
  audience_kind: z.enum(ANNOUNCEMENT_AUDIENCE_KINDS, 'Choose who it is for.'),
  audience_role: z.enum(ANNOUNCEMENT_AUDIENCE_ROLES).nullish(),
  course_id: z.uuid('Choose a course.').nullish(),
  group_id: z.uuid('Choose a group.').nullish(),
  /** An ISO timestamp in UTC, for a scheduled announcement */
  publish_at: z.iso.datetime('Choose when to publish it.').nullish(),
})

type RefinableAnnouncement = {
  audience_kind: AnnouncementAudienceKind
  audience_role?: AnnouncementAudienceRole | null
  course_id?: string | null
  group_id?: string | null
  publish_mode?: AnnouncementPublishMode
  publish_at?: string | null
}

/** The audience kind needs its own target, and a scheduled announcement needs its time */
const refineAnnouncement = (value: RefinableAnnouncement, context: z.RefinementCtx) => {
  if (value.audience_kind === 'ROLE' && !value.audience_role) {
    context.addIssue({ code: 'custom', path: ['audience_role'], message: 'Choose a role.' })
  }
  if (value.audience_kind === 'COURSE' && !value.course_id) {
    context.addIssue({ code: 'custom', path: ['course_id'], message: 'Choose a course.' })
  }
  if (value.audience_kind === 'GROUP' && !value.group_id) {
    context.addIssue({ code: 'custom', path: ['group_id'], message: 'Choose a group.' })
  }
  if (value.publish_mode === 'SCHEDULED' && !value.publish_at) {
    context.addIssue({ code: 'custom', path: ['publish_at'], message: 'Choose when to publish it.' })
  }
}

export const createAnnouncementSchema = announcementFieldsSchema
  .extend({ publish_mode: z.enum(ANNOUNCEMENT_PUBLISH_MODES, 'Choose how to publish it.') })
  .superRefine(refineAnnouncement)

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>

/** Editing: publish_mode is left out for an announcement that is already out, whose time can't change */
export const updateAnnouncementSchema = announcementFieldsSchema.extend({ publish_mode: z.enum(ANNOUNCEMENT_PUBLISH_MODES).optional() }).superRefine(refineAnnouncement)

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>

export type AnnouncementAuthor = {
  membership_id: string
  first_name: string
  last_name: string
}

type AnnouncementTarget = {
  id: string
  name: string
}

/** One announcement in the list. Dates are ISO timestamps in UTC. */
export type AnnouncementSummary = {
  id: string
  title: string
  audience_kind: AnnouncementAudienceKind
  audience_role: AnnouncementAudienceRole | null
  course: AnnouncementTarget | null
  group: AnnouncementTarget | null
  author: AnnouncementAuthor
  status: AnnouncementStatus
  /** Null for a draft */
  publish_at: string | null
  /** Set when it was changed after it went out */
  edited_at: string | null
  /** The viewer is an addressee and hasn't opened it yet */
  is_unread: boolean
  /** The viewer may edit and archive it */
  can_manage: boolean
}

/** How many of the people it reached have opened it; the author isn't counted */
export type AnnouncementReadCounts = {
  read_count: number
  audience_size: number
}

export type AnnouncementDetail = AnnouncementSummary & {
  body: string
  /** Only for those who manage it */
  read_counts: AnnouncementReadCounts | null
  /** The audience can still be changed: always for staff, for a lecturer only before it goes out */
  can_change_audience: boolean
  /** The publishing choice can still be changed: only before it goes out */
  can_change_publishing: boolean
}

/** What the viewer may address an announcement to; a lecturer only gets what they currently teach */
export type AnnouncementAudienceOptions = {
  can_address_school: boolean
  roles: AnnouncementAudienceRole[]
  courses: AnnouncementTarget[]
  groups: (AnnouncementTarget & { course_name: string })[]
  /** The viewer may write announcements at all */
  can_create: boolean
}

export type AnnouncementUnreadCount = {
  unread_count: number
}
