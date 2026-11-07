import type { z } from 'zod'
import type { enrolmentParamSchema, groupParamSchema, substitutionParamSchema } from './groups.schema.ts'

export type { GroupEnrolmentInput, GroupInput, GroupMoveInput, GroupStatus, GroupSubstitutionInput, ListGroupsQuery } from '@shigjetademy/shared/groups'

export type GroupParam = z.infer<typeof groupParamSchema>

export type SubstitutionParam = z.infer<typeof substitutionParamSchema>

export type EnrolmentParam = z.infer<typeof enrolmentParamSchema>
