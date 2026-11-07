import { z } from 'zod'

export { groupSchema, listGroupsQuerySchema } from '@shigjetademy/shared/groups'

export const groupParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
})
