import { z } from 'zod'
import { assignmentDetailsSchema, maxPointsFieldSchema } from '@shigjetademy/shared/assignments'
import type { Assignment, CreateAssignmentFields, UpdateAssignmentFields } from '@shigjetademy/shared/assignments'
import { MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE, MATERIAL_FILE_TYPE_MESSAGE, isAllowedMaterialFile } from '@shigjetademy/shared/materials'
import { toUtcIso, toWallClock } from '#/lib/schedule-time'

/** The file checks the server makes too, so a wrong file is refused before it is sent; assignments take the files materials take */
export const assignmentFileSchema = z
  .instanceof(File)
  .refine((file) => isAllowedMaterialFile({ name: file.name, type: file.type }), MATERIAL_FILE_TYPE_MESSAGE)
  .refine((file) => file.size <= MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE)

/** Checked with the server's rule, kept as the text the form sends */
const maxPointsSchema = z.string().superRefine((value, context) => {
  const result = maxPointsFieldSchema.safeParse(value)
  if (!result.success) context.addIssue({ code: 'custom', message: result.error.issues[0]?.message ?? 'Check the points.' })
})

/** The form's fields: the due day and time are the school's wall clock until they are sent as one UTC moment */
export const assignmentFormSchema = z.object({
  title: assignmentDetailsSchema.shape.title,
  instructions: assignmentDetailsSchema.shape.instructions,
  due_day: z.string().min(1, 'Choose a due day.'),
  due_time: z.string().min(1, 'Choose a due time.'),
  max_points: maxPointsSchema,
  accepts_late_hand_ins: z.boolean(),
  file: assignmentFileSchema.nullable(),
  /** Editing only: take the saved file away */
  remove_file: z.boolean(),
})

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>

export const EMPTY_ASSIGNMENT_FORM: AssignmentFormValues = { title: '', instructions: '', due_day: '', due_time: '', max_points: '', accepts_late_hand_ins: true, file: null, remove_file: false }

type ToFormValuesParams = {
  assignment: Assignment
  timeZone: string
}

/** The edit form, starting from what is saved, with the due moment on the school's clock */
export const toAssignmentFormValues = ({ assignment, timeZone }: ToFormValuesParams): AssignmentFormValues => {
  const due = toWallClock({ iso: assignment.due_at, timeZone })
  return {
    title: assignment.title,
    instructions: assignment.instructions,
    due_day: due.day,
    due_time: due.time,
    max_points: assignment.max_points === null ? '' : String(assignment.max_points),
    accepts_late_hand_ins: assignment.accepts_late_hand_ins,
    file: null,
    remove_file: false,
  }
}

/** A yes or no as the form text the server reads */
const toFlag = (value: boolean): 'true' | 'false' => (value ? 'true' : 'false')

type ToFieldsParams = {
  values: AssignmentFormValues
  timeZone: string
}

const toDetailFields = ({ values, timeZone }: ToFieldsParams) => ({
  title: values.title,
  instructions: values.instructions,
  due_at: toUtcIso({ day: values.due_day, time: values.due_time, timeZone }),
  max_points: values.max_points.trim(),
  accepts_late_hand_ins: toFlag(values.accepts_late_hand_ins),
})

export const toCreateFields = ({ values, timeZone, groupId }: ToFieldsParams & { groupId: string }): Required<CreateAssignmentFields> => ({ ...toDetailFields({ values, timeZone }), group_id: groupId })

export const toUpdateFields = ({ values, timeZone }: ToFieldsParams): Required<UpdateAssignmentFields> => ({ ...toDetailFields({ values, timeZone }), remove_file: toFlag(values.remove_file && !values.file) })
