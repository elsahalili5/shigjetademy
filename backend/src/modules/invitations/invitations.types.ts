import type { z } from 'zod'
import type { invitationParamSchema } from './invitations.schema.ts'

export type { InviteMemberInput } from '@shigjetademy/shared/organization'
export type { InviteRecordInput } from '@shigjetademy/shared/invitations'

export type InvitationParam = z.infer<typeof invitationParamSchema>

export type TokenParam = { token: string }
