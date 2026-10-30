import { z } from 'zod'
import { ACTIVITY_ACTIONS, ACTIVITY_PAGE_SIZE, ACTIVITY_PAGE_SIZE_MAX } from '@shigjetademy/shared/activity'

export const listActivityQuerySchema = z
  .object({
    organizationId: z.uuid('Invalid organization id').optional(),
    action: z.enum(ACTIVITY_ACTIONS, 'Unknown action').optional(),
    limit: z.coerce.number().int().min(1).max(ACTIVITY_PAGE_SIZE_MAX).default(ACTIVITY_PAGE_SIZE),
    // The last entry already shown, for "Load more"; the id breaks ties between entries from the same millisecond
    before: z.iso.datetime('Invalid date').optional(),
    beforeId: z.uuid('Invalid entry id').optional(),
  })
  .refine((query) => !query.before === !query.beforeId, { error: 'Send before and beforeId together', path: ['beforeId'] })
