import type { z } from 'zod'
import type { departmentParamSchema, locationParamSchema } from './location.schema.ts'

export type { DepartmentInput, LocationInput, RemoveLocationQuery } from '@shigjetademy/shared/location'

export type LocationParam = z.infer<typeof locationParamSchema>
export type DepartmentParam = z.infer<typeof departmentParamSchema>
