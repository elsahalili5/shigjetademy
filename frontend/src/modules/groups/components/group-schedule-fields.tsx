import { useId } from 'react'
import { useFieldArray } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { WEEKDAYS } from '@shigjetademy/shared/groups'
import type { GroupInput } from '@shigjetademy/shared/groups'
import { SelectField } from '#/components/SelectField'
import { getFieldError, getFieldErrorsFromBackendError } from '#/lib/error-message'
import { AuthField, FieldError } from '#/modules/auth/components/auth-field'
import { NEW_SCHEDULE_ENTRY } from '../utils/new-schedule-entry'
import { WEEKDAY_LABELS } from '../utils/schedule-label'

interface GroupScheduleFieldsProps {
  control: Control<GroupInput>
  register: UseFormRegister<GroupInput>
  errors: FieldErrors<GroupInput>
  backendError: unknown
  isDisabled: boolean
}

/** The group's weekly days and times, one row each, added and removed in place */
export function GroupScheduleFields({ control, register, errors, backendError, isDisabled }: GroupScheduleFieldsProps) {
  const entries = useFieldArray({ control, name: 'schedule' })
  const legendId = useId()
  const errorId = useId()
  // A missing or refused schedule as a whole; the server sends every schedule message under one key
  const listError = errors.schedule?.root?.message ?? errors.schedule?.message ?? getFieldErrorsFromBackendError(backendError).schedule

  return (
    <fieldset className="grid gap-3" aria-labelledby={legendId} aria-describedby={listError ? errorId : undefined}>
      <legend id={legendId} className="text-[0.987rem] font-[650]">
        Schedule
      </legend>
      {entries.fields.length === 0 ? <p className="text-ink-2">No schedule</p> : null}
      {entries.fields.map((field, index) => (
        <ScheduleEntryFields key={field.id} index={index} register={register} errors={errors} backendError={backendError} isDisabled={isDisabled} onRemove={() => entries.remove(index)} />
      ))}
      {listError ? <FieldError id={errorId}>{listError}</FieldError> : null}
      <button type="button" className="button button--ghost min-h-10 justify-self-start px-4 text-base" disabled={isDisabled} onClick={() => entries.append({ ...NEW_SCHEDULE_ENTRY })}>
        <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
        Add a day and time
      </button>
    </fieldset>
  )
}

interface ScheduleEntryFieldsProps {
  index: number
  register: UseFormRegister<GroupInput>
  errors: FieldErrors<GroupInput>
  backendError: unknown
  isDisabled: boolean
  onRemove: () => void
}

function ScheduleEntryFields({ index, register, errors, backendError, isDisabled, onRemove }: ScheduleEntryFieldsProps) {
  const ids = { day: useId(), start: useId(), end: useId() }
  const label = `Day and time ${index + 1}`
  const fieldError = (fieldName: `schedule.${number}.${'weekday' | 'start_time' | 'end_time'}`) => getFieldError<GroupInput>({ fieldName, formErrors: errors, backendError })

  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 max-[560px]:grid-cols-2" role="group" aria-label={label}>
      <SelectField id={ids.day} label="Day" disabled={isDisabled} error={fieldError(`schedule.${index}.weekday`)} {...register(`schedule.${index}.weekday`)}>
        {WEEKDAYS.map((weekday) => (
          <option key={weekday} value={weekday}>
            {WEEKDAY_LABELS[weekday]}
          </option>
        ))}
      </SelectField>
      <AuthField id={ids.start} label="Start" type="time" disabled={isDisabled} error={fieldError(`schedule.${index}.start_time`)} {...register(`schedule.${index}.start_time`)} />
      <AuthField id={ids.end} label="End" type="time" disabled={isDisabled} error={fieldError(`schedule.${index}.end_time`)} {...register(`schedule.${index}.end_time`)} />
      <button
        type="button"
        className="mt-[30px] grid size-11 place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink disabled:opacity-50"
        aria-label={`Remove ${label.toLowerCase()}`}
        disabled={isDisabled}
        onClick={onRemove}
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}
