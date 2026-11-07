import { z } from 'zod'

export { inviteMemberSchema } from '@shigjetademy/shared/organization'
export { inviteRecordSchema } from '@shigjetademy/shared/invitations'

export const invitationParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  invitationId: z.uuid('Invalid invitation id'),
})
