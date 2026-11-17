import { z } from 'zod'
import { handInSchema } from '@shigjetademy/shared/assignments'
import type { AssignmentHandIn, HandInFields } from '@shigjetademy/shared/assignments'
import { assignmentFileSchema } from './assignment-form'

const EMPTY_MESSAGE = 'Write your answer or attach a file.'

/** The hand-in form: the answer, a new file, and whether to keep the file handed in before; it needs words or a file */
export const handInFormSchema = z
  .object({
    text: handInSchema.shape.text,
    file: assignmentFileSchema.nullable(),
    keep_file: z.boolean(),
    /** Whether a file was handed in before, which keep_file keeps */
    has_saved_file: z.boolean(),
  })
  .superRefine((values, context) => {
    const hasFile = !!values.file || (values.keep_file && values.has_saved_file)
    if (!values.text.trim() && !hasFile) context.addIssue({ code: 'custom', path: ['text'], message: EMPTY_MESSAGE })
  })

export type HandInFormValues = z.infer<typeof handInFormSchema>

/** The form starts from the student's hand-in, keeping its file */
export const toHandInFormValues = (handIn: AssignmentHandIn | null): HandInFormValues => ({ text: handIn?.text ?? '', file: null, keep_file: !!handIn?.file, has_saved_file: !!handIn?.file })

/** A new file replaces the saved one, so it is only kept without one */
export const toHandInFields = (values: HandInFormValues): Required<HandInFields> => ({ text: values.text, keep_file: values.keep_file && !values.file ? 'true' : 'false' })
