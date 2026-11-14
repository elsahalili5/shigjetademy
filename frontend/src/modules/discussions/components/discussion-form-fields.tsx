import { useId } from 'react'
import type { FormEventHandler } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { DISCUSSION_BODY_MAX_LENGTH, DISCUSSION_TITLE_MAX_LENGTH } from '@shigjetademy/shared/discussions'
import type { DiscussionSpace } from '@shigjetademy/shared/discussions'
import { FormAlert } from '#/components/FormAlert'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import type { DiscussionFormValues } from '../utils/discussion-form'
import { getSpaceKey, getSpaceLabel } from '../utils/space'

interface DiscussionFormFieldsProps {
  form: UseFormReturn<DiscussionFormValues>
  /** The spaces to pick from; left out when the topic's space can't change */
  spaces?: DiscussionSpace[]
  submitLabel: string
  isPending: boolean
  error: unknown
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

/** The topic form: where to post it (for a new topic), a title and a message */
export function DiscussionFormFields({ form, spaces, submitLabel, isPending, error, onSubmit, onCancel }: DiscussionFormFieldsProps) {
  const ids = { title: useId(), body: useId(), space: useId() }
  const { errors } = form.formState
  const fieldError = (fieldName: keyof DiscussionFormValues) => getFieldError<DiscussionFormValues>({ fieldName, formErrors: errors, backendError: error })
  const titleError = fieldError('title')
  const bodyError = fieldError('body')

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        {spaces ? (
          <SelectField id={ids.space} label="Post in" error={fieldError('space')} disabled={isPending} {...form.register('space')}>
            <option value="">Choose a group or course</option>
            {spaces.map((space) => (
              <option key={getSpaceKey(space)} value={getSpaceKey(space)}>
                {getSpaceLabel(space)}
              </option>
            ))}
          </SelectField>
        ) : null}

        <div className="grid gap-1.5">
          <label className="text-[0.987rem] font-[650]" htmlFor={ids.title}>
            Title
          </label>
          <input id={ids.title} className={INPUT_CLASS} maxLength={DISCUSSION_TITLE_MAX_LENGTH} aria-invalid={!!titleError} aria-describedby={titleError ? `${ids.title}-error` : undefined} disabled={isPending} {...form.register('title')} />
          {titleError ? <FieldError id={`${ids.title}-error`}>{titleError}</FieldError> : null}
        </div>

        <div className="grid gap-1.5">
          <label className="text-[0.987rem] font-[650]" htmlFor={ids.body}>
            Message
          </label>
          <textarea
            id={ids.body}
            className={`${INPUT_CLASS} min-h-[140px] resize-y py-3`}
            maxLength={DISCUSSION_BODY_MAX_LENGTH}
            aria-invalid={!!bodyError}
            aria-describedby={bodyError ? `${ids.body}-error` : undefined}
            disabled={isPending}
            {...form.register('body')}
          />
          {bodyError ? <FieldError id={`${ids.body}-error`}>{bodyError}</FieldError> : null}
        </div>

        {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </footer>
    </form>
  )
}
