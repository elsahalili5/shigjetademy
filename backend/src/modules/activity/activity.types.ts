import type { z } from 'zod'
import type { listActivityQuerySchema } from './activity.schema.ts'

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>
