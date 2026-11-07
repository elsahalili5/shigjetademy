import { z } from 'zod'

export { groupSchema, groupSubstitutionSchema, listGroupsQuerySchema } from '@shigjetademy/shared/groups'

export const groupParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
})

export const substitutionParamSchema = groupParamSchema.extend({
  substitutionId: z.uuid('Invalid substitution id'),
})
