import type { z } from 'zod'
import type { testParamSchema } from './tests.schema.ts'

export type { CreateTestInput, RecordTestResultsInput, TestGroupQuery, UpdateTestInput } from '@shigjetademy/shared/tests'

export type TestParam = z.infer<typeof testParamSchema>
