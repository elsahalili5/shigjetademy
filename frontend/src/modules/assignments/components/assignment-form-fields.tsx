import { useId } from 'react'
import type { ChangeEvent, FormEventHandler } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ASSIGNMENT_INSTRUCTIONS_MAX_LENGTH, ASSIGNMENT_TITLE_MAX_LENGTH } from '@shigjetademy/shared/assignments'
import type { AssignmentFile } from '@shigjetademy/shared/assignments'
import { MATERIAL_FILE_ACCEPT } from '@shigjetademy/shared/materials'
import { FormAlert } from '#/components/FormAlert'
import { FormDialogFooter } from '#/components/FormDialogFooter'
import { FormField } from '#/components/FormField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { fieldProps } from '#/lib/field-props'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import type { AssignmentFormValues } from '../utils/assignment-form'

interface AssignmentFormFieldsProps {
  form: UseFormReturn<AssignmentFormValues>
  /** The saved file when editing, which a new one replaces or the member takes away */
  savedFile: AssignmentFile | null
  submitLabel: string
  /** The school's time zone, where the due day and time are read */
  timeZone: string
  isPending: boolean
  error: unknown
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

/** The assignment form: a title, instructions, the due day and time, optional max points and an optional file */
export function AssignmentFormFields({ form, savedFile, submitLabel, timeZone, isPending, error, onSubmit, onCancel }: AssignmentFormFieldsProps) {
  const ids = { title: useId(), instructions: useId(), dueDay: useId(), dueTime: useId(), acceptsLate: useId(), maxPoints: useId(), file: useId(), removeFile: useId() }
  const { errors } = form.formState
  const fieldError = (fieldName: keyof AssignmentFormValues) => getFieldError<AssignmentFormValues>({ fieldName, formErrors: errors, backendError: error })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => form.setValue('file', event.target.files?.[0] ?? null, { shouldValidate: form.formState.isSubmitted })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        <FormField id={ids.title} label="Title" error={fieldError('title')}>
          <input id={ids.title} className={INPUT_CLASS} maxLength={ASSIGNMENT_TITLE_MAX_LENGTH} {...fieldProps({ id: ids.title, error: fieldError('title'), isPending })} {...form.register('title')} />
        </FormField>

        <FormField id={ids.instructions} label="Instructions" error={fieldError('instructions')}>
          <textarea
            id={ids.instructions}
            className={`${INPUT_CLASS} min-h-[140px] resize-y py-3`}
            maxLength={ASSIGNMENT_INSTRUCTIONS_MAX_LENGTH}
            {...fieldProps({ id: ids.instructions, error: fieldError('instructions'), isPending })}
            {...form.register('instructions')}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id={ids.dueDay} label="Due day" error={fieldError('due_day')}>
            <input id={ids.dueDay} type="date" className={INPUT_CLASS} {...fieldProps({ id: ids.dueDay, error: fieldError('due_day'), isPending })} {...form.register('due_day')} />
          </FormField>
          <FormField id={ids.dueTime} label="Due time" error={fieldError('due_time')}>
            <input id={ids.dueTime} type="time" className={INPUT_CLASS} {...fieldProps({ id: ids.dueTime, error: fieldError('due_time'), isPending })} {...form.register('due_time')} />
          </FormField>
          <p className="text-[0.9rem] text-ink-3 sm:col-span-2">Times are in the school’s time zone, {timeZone}.</p>
        </div>

        <div className="grid gap-0.5">
          <label htmlFor={ids.acceptsLate} className="flex items-center gap-3 font-[650]">
            <input id={ids.acceptsLate} type="checkbox" className="size-4 accent-green-deep" disabled={isPending} aria-describedby={`${ids.acceptsLate}-hint`} {...form.register('accepts_late_hand_ins')} />
            Accept late hand-ins
          </label>
          <p id={`${ids.acceptsLate}-hint`} className="pl-7 text-[0.9rem] text-ink-3">
            Hand-ins after the due date are taken and marked late. Turn off to close hand-ins at the due date.
          </p>
        </div>

        <FormField id={ids.maxPoints} label="Max points" hint="Optional" error={fieldError('max_points')}>
          <input id={ids.maxPoints} inputMode="numeric" className={INPUT_CLASS} {...fieldProps({ id: ids.maxPoints, error: fieldError('max_points'), isPending })} {...form.register('max_points')} />
        </FormField>

        <FormField id={ids.file} label="File" hint={savedFile ? 'Optional, replaces the saved file' : 'Optional, up to 20 MB'} error={fieldError('file')}>
          <input
            id={ids.file}
            type="file"
            accept={MATERIAL_FILE_ACCEPT}
            className="text-[0.95rem] file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-2 file:font-semibold"
            {...fieldProps({ id: ids.file, error: fieldError('file'), isPending })}
            onChange={handleFileChange}
          />
        </FormField>

        {savedFile ? (
          <label htmlFor={ids.removeFile} className="flex items-center gap-3">
            <input id={ids.removeFile} type="checkbox" className="size-4 accent-green-deep" disabled={isPending} {...form.register('remove_file')} />
            <span>Remove the saved file, {savedFile.name}</span>
          </label>
        ) : null}

        {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      </div>

      <FormDialogFooter submitLabel={submitLabel} isPending={isPending} onCancel={onCancel} />
    </form>
  )
}
