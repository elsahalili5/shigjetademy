import type { z } from 'zod'
import type { groupParamSchema } from './groups.schema.ts'

export type { GroupInput, GroupStatus, ListGroupsQuery } from '@shigjetademy/shared/groups'

export type GroupParam = z.infer<typeof groupParamSchema>
