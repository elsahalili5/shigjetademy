// Private 1:1 messaging between members of one organization. Who may message whom is canMessage's rule, checked when listing contacts, starting a
// conversation and sending; reading is limited to the two participants, and a conversation that can no longer be sent into stays readable.
import { Prisma } from '@generated/prisma/client.ts'
import type { InboxContact, InboxConversation, InboxConversationSummary, InboxMessage, InboxUnreadCount, SendBlockedReason, StartedConversation } from '@shigjetademy/shared/inbox'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { canMessage } from './can-message.ts'
import type { MessagingDirectory } from './messaging-directory.ts'
import { loadMessagingDirectory } from './messaging-directory.ts'
import type { SendMessageInput, StartConversationInput } from './inbox.types.ts'

/** A conversation shows its newest messages; older ones stay stored */
const THREAD_MESSAGE_LIMIT = 200

const UNIQUE_VIOLATION = 'P2002'

const BLOCKED_MESSAGES: Record<SendBlockedReason, string> = {
  studentMessagingDisabled: 'Messaging students is turned off for this organization.',
  notAllowed: 'You can’t message this person.',
}

const messageSelect = { id: true, sender_membership_id: true, body: true, created_at: true } as const satisfies Prisma.MessageSelect

type StoredMessage = Prisma.MessageGetPayload<{ select: typeof messageSelect }>

const toMessageJson = ({ created_at, ...message }: StoredMessage): InboxMessage => ({ ...message, created_at: created_at.toISOString() })

const otherSelect = { membership: { select: { id: true, role: true, user: { select: { first_name: true, last_name: true } } } } } as const satisfies Prisma.ConversationParticipantSelect

type StoredOther = Prisma.ConversationParticipantGetPayload<{ select: typeof otherSelect }>

const toParticipantJson = ({ membership }: StoredOther): InboxContact => ({
  membership_id: membership.id,
  first_name: membership.user.first_name,
  last_name: membership.user.last_name,
  role: membership.role,
})

type ViewerScope = {
  organizationId: string
  membershipId: string
}

type ConversationScope = ViewerScope & {
  conversationId: string
}

/** The viewer's seat in the conversation, or 404 (the same as no such conversation) when they aren't one of its two participants */
const findParticipation = async ({ organizationId, membershipId, conversationId }: ConversationScope) => {
  const participation = await prisma.conversationParticipant.findFirst({
    where: { conversation_id: conversationId, membership_id: membershipId, conversation: { organization_id: organizationId } },
    select: { last_read_at: true, conversation: { select: { id: true, participants: { where: { membership_id: { not: membershipId } }, select: { last_read_at: true, ...otherSelect } } } } },
  })
  const other = participation?.conversation.participants[0]
  if (!participation || !other) {
    throw new HttpError(404, 'Conversation not found')
  }
  return { conversationId: participation.conversation.id, other, myLastReadAt: participation.last_read_at }
}

type DecideParams = {
  directory: MessagingDirectory
  senderId: string
  recipientId: string
}

/** The messaging rule for two members; a member who is gone or without a login can't be messaged */
const decide = ({ directory, senderId, recipientId }: DecideParams) => {
  const sender = directory.people.get(senderId)
  const recipient = directory.people.get(recipientId)
  if (!sender || !recipient) return { allowed: false, reason: 'notAllowed' } as const
  return canMessage({ sender, recipient, context: directory.context })
}

const assertAllowed = (decision: ReturnType<typeof decide>) => {
  if (!decision.allowed) {
    throw new HttpError(403, BLOCKED_MESSAGES[decision.reason])
  }
}

/** Unread messages per conversation: the other side's messages after the viewer last read it, or all of them before the viewer ever has */
const readUnreadCounts = async (membershipId: string) => {
  const rows = await prisma.$queryRaw<{ conversation_id: string; unread: number }[]>(Prisma.sql`
    SELECT m.conversation_id, COUNT(*)::int AS unread
    FROM "Message" m
    JOIN "ConversationParticipant" p ON p.conversation_id = m.conversation_id AND p.membership_id = ${membershipId}::uuid
    WHERE m.sender_membership_id <> ${membershipId}::uuid AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
    GROUP BY m.conversation_id`)
  return new Map(rows.map((row) => [row.conversation_id, row.unread]))
}

type AppendMessageParams = {
  conversationId: string
  membershipId: string
  body: string
}

/** Adds the message, moves the conversation to the top and counts everything up to it as read by its sender */
const appendMessage = ({ conversationId, membershipId, body }: AppendMessageParams) =>
  prisma.$transaction(async (tx) => {
    const now = new Date()
    const message = await tx.message.create({ data: { conversation_id: conversationId, sender_membership_id: membershipId, body, created_at: now }, select: messageSelect })
    await tx.conversation.update({ where: { id: conversationId }, data: { last_message_at: now } })
    await tx.conversationParticipant.update({ where: { conversation_id_membership_id: { conversation_id: conversationId, membership_id: membershipId } }, data: { last_read_at: now } })
    return toMessageJson(message)
  })

/** The same pair always gets the same key, whoever starts the conversation */
const toPairKey = (first: string, second: string) => [first, second].sort().join(':')

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION

export const InboxService = {
  listContacts: async ({ organizationId, membershipId }: ViewerScope): Promise<InboxContact[]> => {
    const directory = await loadMessagingDirectory({ organizationId })
    const contacts = [...directory.people.values()].filter((person) => decide({ directory, senderId: membershipId, recipientId: person.membershipId }).allowed)
    return contacts
      .map((person) => ({ membership_id: person.membershipId, first_name: person.firstName, last_name: person.lastName, role: person.role }))
      .sort((a, b) => a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name))
  },

  listConversations: async ({ organizationId, membershipId }: ViewerScope): Promise<InboxConversationSummary[]> => {
    const [participations, unreadCounts] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { membership_id: membershipId, conversation: { organization_id: organizationId } },
        orderBy: { conversation: { last_message_at: 'desc' } },
        select: {
          conversation: {
            select: {
              id: true,
              last_message_at: true,
              participants: { where: { membership_id: { not: membershipId } }, select: otherSelect },
              messages: { orderBy: { created_at: 'desc' }, take: 1, select: messageSelect },
            },
          },
        },
      }),
      readUnreadCounts(membershipId),
    ])
    return participations.flatMap(({ conversation }) => {
      const other = conversation.participants[0]
      if (!other) return []
      const lastMessage = conversation.messages[0]
      return [
        {
          id: conversation.id,
          other: toParticipantJson(other),
          last_message: lastMessage ? toMessageJson(lastMessage) : null,
          unread_count: unreadCounts.get(conversation.id) ?? 0,
          last_message_at: conversation.last_message_at.toISOString(),
        },
      ]
    })
  },

  // Opening a conversation marks it read for the viewer only
  getConversation: async (scope: ConversationScope): Promise<InboxConversation> => {
    const { conversationId, other, myLastReadAt } = await findParticipation(scope)
    const [newestFirst, directory] = await Promise.all([
      prisma.message.findMany({ where: { conversation_id: conversationId }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: THREAD_MESSAGE_LIMIT, select: messageSelect }),
      loadMessagingDirectory({ organizationId: scope.organizationId }),
    ])
    // Read up to the newest message returned, not to now, so one arriving meanwhile stays unread; nothing is written when nothing is newer
    const readUntil = newestFirst[0]?.created_at
    if (readUntil && (!myLastReadAt || readUntil > myLastReadAt)) {
      await prisma.conversationParticipant.update({
        where: { conversation_id_membership_id: { conversation_id: conversationId, membership_id: scope.membershipId } },
        data: { last_read_at: readUntil },
      })
    }
    const decision = decide({ directory, senderId: scope.membershipId, recipientId: other.membership.id })
    return {
      id: conversationId,
      my_membership_id: scope.membershipId,
      other: toParticipantJson(other),
      messages: newestFirst.reverse().map(toMessageJson),
      other_last_read_at: other.last_read_at?.toISOString() ?? null,
      can_send: decision.allowed,
      send_blocked_reason: decision.allowed ? null : decision.reason,
    }
  },

  sendMessage: async ({ organizationId, membershipId, conversationId, data }: ConversationScope & { data: SendMessageInput }): Promise<InboxMessage> => {
    const { other } = await findParticipation({ organizationId, membershipId, conversationId })
    const directory = await loadMessagingDirectory({ organizationId })
    assertAllowed(decide({ directory, senderId: membershipId, recipientId: other.membership.id }))
    return appendMessage({ conversationId, membershipId, body: data.body })
  },

  // Creates the pair's conversation with the first message in one step; when the pair already has one, or the other side creates it at the same moment, the message goes into that one
  startConversation: async ({ organizationId, membershipId, data }: ViewerScope & { data: StartConversationInput }): Promise<StartedConversation> => {
    const directory = await loadMessagingDirectory({ organizationId })
    if (!directory.people.has(data.recipient_membership_id)) {
      throw new HttpError(404, 'Recipient not found')
    }
    assertAllowed(decide({ directory, senderId: membershipId, recipientId: data.recipient_membership_id }))
    const pairKey = toPairKey(membershipId, data.recipient_membership_id)
    const existing = await prisma.conversation.findUnique({ where: { organization_id_pair_key: { organization_id: organizationId, pair_key: pairKey } }, select: { id: true } })
    if (existing) {
      return { conversation_id: existing.id, message: await appendMessage({ conversationId: existing.id, membershipId, body: data.body }) }
    }
    const now = new Date()
    try {
      const conversation = await prisma.conversation.create({
        data: {
          organization_id: organizationId,
          pair_key: pairKey,
          last_message_at: now,
          participants: { create: [{ membership_id: membershipId, last_read_at: now }, { membership_id: data.recipient_membership_id }] },
          messages: { create: { sender_membership_id: membershipId, body: data.body, created_at: now } },
        },
        select: { id: true, messages: { select: messageSelect } },
      })
      return { conversation_id: conversation.id, message: toMessageJson(conversation.messages[0]) }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      // The other side created it at the same moment
      const raced = await prisma.conversation.findUniqueOrThrow({ where: { organization_id_pair_key: { organization_id: organizationId, pair_key: pairKey } }, select: { id: true } })
      return { conversation_id: raced.id, message: await appendMessage({ conversationId: raced.id, membershipId, body: data.body }) }
    }
  },

  getUnreadCount: async (membershipId: string): Promise<InboxUnreadCount> => {
    const counts = await readUnreadCounts(membershipId)
    return { unread_count: [...counts.values()].reduce((total, unread) => total + unread, 0) }
  },
}
