import { z } from 'zod'
import { testDetailsSchema } from '@shigjetademy/shared/tests'
import type { CreateTestInput, Test, UpdateTestInput } from '@shigjetademy/shared/tests'
import { toUtcIso, toWallClock } from '#/lib/schedule-time'
import { WHOLE_NUMBER } from './points'

const WHOLE_POINTS_MESSAGE = 'Enter whole points, like 20.'

/** Typed as text, checked with the server's rule once it is a number */
const maxPointsSchema = z.string().superRefine((value, context) => {
  const trimmed = value.trim()
  if (!WHOLE_NUMBER.test(trimmed)) {
    context.addIssue({ code: 'custom', message: WHOLE_POINTS_MESSAGE })
    return
  }
  const result = testDetailsSchema.shape.max_points.safeParse(Number(trimmed))
  if (!result.success) context.addIssue({ code: 'custom', message: result.error.issues[0]?.message ?? WHOLE_POINTS_MESSAGE })
})

/** The form's fields: the day and time are the school's wall clock until they are sent as one UTC moment */
export const testFormSchema = z.object({
  title: testDetailsSchema.shape.title,
  description: testDetailsSchema.shape.description,
  held_day: z.string().min(1, 'Choose a day.'),
  held_time: z.string().min(1, 'Choose a time.'),
  max_points: maxPointsSchema,
})

export type TestFormValues = z.infer<typeof testFormSchema>

export const EMPTY_TEST_FORM: TestFormValues = { title: '', description: '', held_day: '', held_time: '', max_points: '' }

type ToFormValuesParams = {
  test: Test
  timeZone: string
}

/** The edit form, starting from what is saved, with the test's moment on the school's clock */
export const toTestFormValues = ({ test, timeZone }: ToFormValuesParams): TestFormValues => {
  const held = toWallClock({ iso: test.held_at, timeZone })
  return { title: test.title, description: test.description ?? '', held_day: held.day, held_time: held.time, max_points: String(test.max_points) }
}

type ToInputParams = {
  values: TestFormValues
  timeZone: string
}

export const toUpdateTestInput = ({ values, timeZone }: ToInputParams): UpdateTestInput => ({
  title: values.title,
  description: values.description,
  held_at: toUtcIso({ day: values.held_day, time: values.held_time, timeZone }),
  max_points: Number(values.max_points.trim()),
})

export const toCreateTestInput = ({ values, timeZone, groupId }: ToInputParams & { groupId: string }): CreateTestInput => ({ group_id: groupId, ...toUpdateTestInput({ values, timeZone }) })
