import type { z } from 'zod'
import type { MemberRole } from '@shigjetademy/shared/auth'
import type { conversationParamSchema, messageParamSchema } from './inbox.schema.ts'

export type { EditMessageInput, SendMessageInput, StartConversationInput } from '@shigjetademy/shared/inbox'

export type ConversationParam = z.infer<typeof conversationParamSchema>

export type MessageParam = z.infer<typeof messageParamSchema>

/** One active member as the messaging rules see them */
export type MessagingParty = {
  membershipId: string
  role: MemberRole
  /** The students this member is tied to: a student their own record, a guardian their linked children, a lecturer the students in the groups they teach today; nobody else any */
  studentIds: ReadonlySet<string>
}

export type MessagingContext = {
  isStudentMessagingEnabled: boolean
}
