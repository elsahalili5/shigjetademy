import { z } from 'zod'

export { groupEnrolmentSchema, groupMoveSchema, groupSchema, groupSubstitutionSchema, lessonRescheduleSchema, listGroupsQuerySchema, newGroupSchema } from '@shigjetademy/shared/groups'

export const groupParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  groupId: z.uuid('Invalid group id'),
})

export const substitutionParamSchema = groupParamSchema.extend({
  substitutionId: z.uuid('Invalid substitution id'),
})

export const enrolmentParamSchema = groupParamSchema.extend({
  enrolmentId: z.uuid('Invalid enrolment id'),
})

export const rescheduleParamSchema = groupParamSchema.extend({
  rescheduleId: z.uuid('Invalid reschedule id'),
})
