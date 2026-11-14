// Discussions: conversations in a group or a course. The forms and the endpoints that store them share these schemas and response shapes.
import { z } from 'zod'

export const DISCUSSION_TITLE_MAX_LENGTH = 150

export const DISCUSSION_BODY_MAX_LENGTH = 5000

export const DISCUSSION_REPLY_MAX_LENGTH = 2000

export const DISCUSSION_SPACE_KINDS = ['GROUP', 'COURSE'] as const

export type DiscussionSpaceKind = (typeof DISCUSSION_SPACE_KINDS)[number]

export const DISCUSSION_REMOVERS = ['AUTHOR', 'MODERATOR'] as const

export type DiscussionRemover = (typeof DISCUSSION_REMOVERS)[number]

export type DiscussionStatus = 'ACTIVE' | 'REMOVED'

const titleSchema = z.string().trim().min(1, 'Write a title.').max(DISCUSSION_TITLE_MAX_LENGTH, `Keep the title under ${DISCUSSION_TITLE_MAX_LENGTH} characters.`)

const bodySchema = z.string().trim().min(1, 'Write a message.').max(DISCUSSION_BODY_MAX_LENGTH, `Keep the message under ${DISCUSSION_BODY_MAX_LENGTH} characters.`)

export const discussionReplyBodySchema = z.string().trim().min(1, 'Write a reply.').max(DISCUSSION_REPLY_MAX_LENGTH, `Keep the reply under ${DISCUSSION_REPLY_MAX_LENGTH} characters.`)

/** The words of a topic: a trimmed title and message, never empty */
export const discussionTopicTextSchema = z.object({ title: titleSchema, body: bodySchema })

export const createDiscussionTopicSchema = discussionTopicTextSchema.extend({
  space_kind: z.enum(DISCUSSION_SPACE_KINDS, 'Choose where to post it.'),
  space_id: z.uuid('Choose where to post it.'),
})

export type CreateDiscussionTopicInput = z.infer<typeof createDiscussionTopicSchema>

export const updateDiscussionTopicSchema = discussionTopicTextSchema

export type UpdateDiscussionTopicInput = z.infer<typeof updateDiscussionTopicSchema>

export const discussionReplySchema = z.object({ body: discussionReplyBodySchema })

export type DiscussionReplyInput = z.infer<typeof discussionReplySchema>

export const pinDiscussionTopicSchema = z.object({ is_pinned: z.boolean() })

export type PinDiscussionTopicInput = z.infer<typeof pinDiscussionTopicSchema>

export const lockDiscussionTopicSchema = z.object({ is_locked: z.boolean() })

export type LockDiscussionTopicInput = z.infer<typeof lockDiscussionTopicSchema>

export type DiscussionAuthor = {
  membership_id: string
  first_name: string
  last_name: string
}

/** A group or a course topics are posted in. A group also carries its course's name. */
export type DiscussionSpaceRef = {
  kind: DiscussionSpaceKind
  id: string
  name: string
  course_name: string | null
}

/** A space the viewer can read; they can start a topic in it unless it is archived */
export type DiscussionSpace = DiscussionSpaceRef & {
  is_archived: boolean
  can_post: boolean
}

/** One topic in the list. Dates are ISO timestamps in UTC. A removed topic keeps no words: its title is empty. */
export type DiscussionTopicSummary = {
  id: string
  title: string
  space: DiscussionSpaceRef
  author: DiscussionAuthor
  is_pinned: boolean
  is_locked: boolean
  status: DiscussionStatus
  removed_by: DiscussionRemover | null
  /** Replies still standing */
  reply_count: number
  last_activity_at: string
  created_at: string
  /** Someone else posted here since the viewer last read it */
  is_unread: boolean
  /** The group or course is archived: readable, but no new replies */
  is_space_archived: boolean
}

/** One reply. A removed reply keeps no words: its body is empty. */
export type DiscussionReply = {
  id: string
  author: DiscussionAuthor
  body: string
  status: DiscussionStatus
  removed_by: DiscussionRemover | null
  edited_at: string | null
  created_at: string
  can_edit: boolean
  can_remove: boolean
}

export type DiscussionTopicDetail = DiscussionTopicSummary & {
  body: string
  edited_at: string | null
  replies: DiscussionReply[]
  /** The viewer is a moderator of the space: its current lecturers, the owner and the admins */
  can_moderate: boolean
  can_edit: boolean
  can_remove: boolean
  /** Not locked, not removed and the space is not archived */
  can_reply: boolean
}

export type DiscussionUnreadCount = {
  unread_count: number
}
