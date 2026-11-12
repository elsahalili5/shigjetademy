// The inbox forms and the endpoints that store them share these schemas and response shapes.
import { z } from 'zod'
import type { MemberRole } from './auth.ts'

export const MESSAGE_MAX_LENGTH = 2000

/** A message's text, trimmed; empty or longer than the limit is refused */
export const messageBodySchema = z.string().trim().min(1, 'Write a message.').max(MESSAGE_MAX_LENGTH, `Keep the message under ${MESSAGE_MAX_LENGTH} characters.`)

export const sendMessageSchema = z.object({
  body: messageBodySchema,
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const startConversationSchema = z.object({
  recipient_membership_id: z.uuid('Choose who to message.'),
  body: messageBodySchema,
})

export type StartConversationInput = z.infer<typeof startConversationSchema>

/** Someone in the organization the viewer may message */
export type InboxContact = {
  membership_id: string
  first_name: string
  last_name: string
  role: MemberRole
}

/** The other side of a conversation; they stay listed even after they leave or can no longer be messaged */
export type InboxParticipant = InboxContact

export type InboxMessage = {
  id: string
  sender_membership_id: string
  body: string
  /** ISO timestamp in UTC */
  created_at: string
}

export type InboxConversationSummary = {
  id: string
  other: InboxParticipant
  last_message: InboxMessage | null
  unread_count: number
  /** ISO timestamp in UTC */
  last_message_at: string
}

/** Why the viewer can't send into a conversation they can still read */
export const SEND_BLOCKED_REASONS = ['studentMessagingDisabled', 'notAllowed'] as const

export type SendBlockedReason = (typeof SEND_BLOCKED_REASONS)[number]

export type InboxConversation = {
  id: string
  /** The viewer's own membership, to tell their messages from the other's */
  my_membership_id: string
  other: InboxParticipant
  /** Oldest first */
  messages: InboxMessage[]
  /** When the other side last opened the conversation: their "seen" mark reaches every message of the viewer's up to this time */
  other_last_read_at: string | null
  can_send: boolean
  send_blocked_reason: SendBlockedReason | null
}

export type InboxUnreadCount = {
  unread_count: number
}

export type StartedConversation = {
  conversation_id: string
  message: InboxMessage
}
