import type { z } from 'zod'
import type { materialParamSchema } from './materials.schema.ts'

export type { CreateMaterialInput, MaterialFileFieldsInput, MaterialSpaceInput, UpdateMaterialInput } from '@shigjetademy/shared/materials'

export type MaterialParam = z.infer<typeof materialParamSchema>
