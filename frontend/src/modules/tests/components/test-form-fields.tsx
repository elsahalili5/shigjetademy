import { useId } from 'react'
import type { FormEventHandler } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { TEST_DESCRIPTION_MAX_LENGTH, TEST_TITLE_MAX_LENGTH } from '@shigjetademy/shared/tests'
import { FormAlert } from '#/components/FormAlert'
import { FormDialogFooter } from '#/components/FormDialogFooter'
import { FormField } from '#/components/FormField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { fieldProps } from '#/lib/field-props'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import type { TestFormValues } from '../utils/test-form'

interface TestFormFieldsProps {
  form: UseFormReturn<TestFormValues>
  submitLabel: string
  /** The school's time zone, where the day and time are read */
  timeZone: string
  isPending: boolean
  error: unknown
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

/** The test form: a title, an optional description, the day and time it is held and its max points */
export function TestFormFields({ form, submitLabel, timeZone, isPending, error, onSubmit, onCancel }: TestFormFieldsProps) {
  const ids = { title: useId(), description: useId(), heldDay: useId(), heldTime: useId(), maxPoints: useId() }
  const { errors } = form.formState
  const fieldError = (fieldName: keyof TestFormValues) => getFieldError<TestFormValues>({ fieldName, formErrors: errors, backendError: error })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        <FormField id={ids.title} label="Title" error={fieldError('title')}>
          <input id={ids.title} className={INPUT_CLASS} maxLength={TEST_TITLE_MAX_LENGTH} {...fieldProps({ id: ids.title, error: fieldError('title'), isPending })} {...form.register('title')} />
        </FormField>

        <FormField id={ids.description} label="Description" hint="Optional" error={fieldError('description')}>
          <textarea
            id={ids.description}
            className={`${INPUT_CLASS} min-h-[110px] resize-y py-3`}
            maxLength={TEST_DESCRIPTION_MAX_LENGTH}
            {...fieldProps({ id: ids.description, error: fieldError('description'), isPending })}
            {...form.register('description')}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id={ids.heldDay} label="Day" error={fieldError('held_day')}>
            <input id={ids.heldDay} type="date" className={INPUT_CLASS} {...fieldProps({ id: ids.heldDay, error: fieldError('held_day'), isPending })} {...form.register('held_day')} />
          </FormField>
          <FormField id={ids.heldTime} label="Time" error={fieldError('held_time')}>
            <input id={ids.heldTime} type="time" className={INPUT_CLASS} {...fieldProps({ id: ids.heldTime, error: fieldError('held_time'), isPending })} {...form.register('held_time')} />
          </FormField>
          <p className="text-[0.9rem] text-ink-3 sm:col-span-2">Times are in the school’s time zone, {timeZone}.</p>
        </div>

        <FormField id={ids.maxPoints} label="Max points" error={fieldError('max_points')}>
          <input id={ids.maxPoints} inputMode="numeric" className={`${INPUT_CLASS} w-32`} {...fieldProps({ id: ids.maxPoints, error: fieldError('max_points'), isPending })} {...form.register('max_points')} />
        </FormField>

        {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      </div>

      <FormDialogFooter submitLabel={submitLabel} isPending={isPending} onCancel={onCancel} />
    </form>
  )
}
