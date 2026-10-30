import type { z } from 'zod'
import type { organizationIdParamSchema } from './organization.schema.ts'

export type { CreateOrganizationInput, UpdateOrganizationStatusInput } from '@shigjetademy/shared/organization'

export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
