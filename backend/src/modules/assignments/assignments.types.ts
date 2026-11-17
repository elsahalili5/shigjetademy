import type { z } from 'zod'
import type { assignmentParamSchema, submissionParamSchema } from './assignments.schema.ts'

export type { AssignmentGroupQuery, CreateAssignmentInput, HandInInput, MarkHandInInput, UpdateAssignmentInput } from '@shigjetademy/shared/assignments'

export type AssignmentParam = z.infer<typeof assignmentParamSchema>

export type SubmissionParam = z.infer<typeof submissionParamSchema>
