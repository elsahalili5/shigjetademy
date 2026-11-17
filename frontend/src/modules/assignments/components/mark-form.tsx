import { useId } from 'react'
import type { FormEvent } from 'react'
import { FEEDBACK_MAX_LENGTH } from '@shigjetademy/shared/assignments'
import type { AssignmentHandIn } from '@shigjetademy/shared/assignments'
import { FormAlert } from '#/components/FormAlert'
import { FormField } from '#/components/FormField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { fieldProps } from '#/lib/field-props'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useMarkForm } from '../hooks/use-mark-form'
import { useMarkHandIn } from '../hooks/use-mark-hand-in'
import { toMarkFormValues, toMarkInput } from '../utils/mark-form'
import type { MarkFormValues } from '../utils/mark-form'

interface MarkFormProps {
  organizationId: string
  assignmentId: string
  maxPoints: number | null
  handIn: AssignmentHandIn
}

/** Points out of the max, when the assignment has one, and feedback; the student sees them once saved, and the mark can change later */
export function MarkForm({ organizationId, assignmentId, maxPoints, handIn }: MarkFormProps) {
  const ids = { points: useId(), feedback: useId() }
  const form = useMarkForm({ maxPoints, mark: handIn.mark })
  const markHandIn = useMarkHandIn({ organizationId, assignmentId, submissionId: handIn.id })
  const isPending = markHandIn.isPending
  const { errors } = form.formState
  const fieldError = (fieldName: keyof MarkFormValues) => getFieldError<MarkFormValues>({ fieldName, formErrors: errors, backendError: markHandIn.error })

  // The saved mark becomes the form's starting point, so the form stays open on it with the saved line showing
  const handleValid = (values: MarkFormValues) => markHandIn.mutate(toMarkInput({ values, maxPoints }), { onSuccess: (row) => form.reset(toMarkFormValues(row.hand_in?.mark ?? null)) })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <form className="grid gap-4 border-t border-rule pt-4" noValidate onSubmit={handleSubmit}>
      {maxPoints === null ? null : (
        <FormField id={ids.points} label="Points" hint={`out of ${maxPoints}`} error={fieldError('points')}>
          <input id={ids.points} inputMode="numeric" className={`${INPUT_CLASS} w-32`} {...fieldProps({ id: ids.points, error: fieldError('points'), isPending })} {...form.register('points')} />
        </FormField>
      )}
      <FormField id={ids.feedback} label="Feedback" error={fieldError('feedback')}>
        <textarea id={ids.feedback} className={`${INPUT_CLASS} min-h-[110px] resize-y py-3`} maxLength={FEEDBACK_MAX_LENGTH} {...fieldProps({ id: ids.feedback, error: fieldError('feedback'), isPending })} {...form.register('feedback')} />
      </FormField>
      {markHandIn.error ? <FormAlert>{getErrorMessage(markHandIn.error)}</FormAlert> : null}
      {markHandIn.isSuccess ? <p className="text-[0.93rem] font-[550] text-green-deep" role="status">Mark saved. The student sees it now.</p> : null}
      <button type="submit" className="button button--primary min-h-10 w-fit px-4 text-base" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save mark'}
      </button>
    </form>
  )
}
