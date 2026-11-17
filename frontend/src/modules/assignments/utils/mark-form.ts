import { z } from 'zod'
import { WHOLE_NUMBER, markHandInSchema } from '@shigjetademy/shared/assignments'
import type { HandInMark, MarkHandInInput } from '@shigjetademy/shared/assignments'

/** What is wrong with the typed points, or null when they fit the max */
const getPointsProblem = ({ points, maxPoints }: { points: string; maxPoints: number }) => {
  if (!points) return `Give points out of ${maxPoints}.`
  if (!WHOLE_NUMBER.test(points)) return 'Enter whole points.'
  if (Number(points) > maxPoints) return `Points can be at most ${maxPoints}.`
  return null
}

/** The mark form: points as typed, checked against the assignment's max (none without one), and feedback */
export const createMarkFormSchema = (maxPoints: number | null) =>
  z
    .object({ points: z.string(), feedback: markHandInSchema.shape.feedback })
    .superRefine((values, context) => {
      if (maxPoints === null) return
      const message = getPointsProblem({ points: values.points.trim(), maxPoints })
      if (message) context.addIssue({ code: 'custom', path: ['points'], message })
    })

export type MarkFormValues = z.infer<ReturnType<typeof createMarkFormSchema>>

/** The form starts from the saved mark, or empty */
export const toMarkFormValues = (mark: HandInMark | null): MarkFormValues => ({ points: typeof mark?.points === 'number' ? String(mark.points) : '', feedback: mark?.feedback ?? '' })

export const toMarkInput = ({ values, maxPoints }: { values: MarkFormValues; maxPoints: number | null }): MarkHandInInput => ({
  points: maxPoints === null ? null : Number(values.points.trim()),
  feedback: values.feedback,
})
