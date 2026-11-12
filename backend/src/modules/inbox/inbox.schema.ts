import { z } from 'zod'

export { sendMessageSchema, startConversationSchema } from '@shigjetademy/shared/inbox'

export const conversationParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  conversationId: z.uuid('Invalid conversation id'),
})
