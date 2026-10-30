import type { z } from 'zod'
import type { membershipParamSchema, organizationIdParamSchema } from './organization.schema.ts'

export type { CreateOrganizationInput, UpdateMemberInput, UpdateOrganizationStatusInput } from '@shigjetademy/shared/organization'

export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
export type MembershipParam = z.infer<typeof membershipParamSchema>
