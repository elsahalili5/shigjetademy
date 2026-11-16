import { z } from 'zod'

export { createMaterialSchema, materialFileFieldsSchema, materialSpaceSchema, updateMaterialSchema } from '@shigjetademy/shared/materials'

export const materialParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  materialId: z.uuid('Invalid material id'),
})
