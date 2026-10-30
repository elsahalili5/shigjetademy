import { z } from 'zod'

// The create schema lives in the shared package so the onboarding form validates the same way
export { createOrganizationSchema, updateMemberSchema, updateOrganizationStatusSchema } from '@shigjetademy/shared/organization'

export const organizationIdParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
})

export const membershipParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  membershipId: z.uuid('Invalid member id'),
})
