import type { z } from 'zod'
import type { groupParamSchema, substitutionParamSchema } from './groups.schema.ts'

export type { GroupInput, GroupStatus, GroupSubstitutionInput, ListGroupsQuery } from '@shigjetademy/shared/groups'

export type GroupParam = z.infer<typeof groupParamSchema>

export type SubstitutionParam = z.infer<typeof substitutionParamSchema>
