import { z } from 'zod'

export { createTestSchema, recordTestResultsSchema, testGroupQuerySchema, updateTestSchema } from '@shigjetademy/shared/tests'

export const testParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  testId: z.uuid('Invalid test id'),
})
