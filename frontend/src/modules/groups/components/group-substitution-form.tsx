import { useId } from 'react'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import type { GroupLecturerOption, GroupSubstitution, GroupSubstitutionInput } from '@shigjetademy/shared/groups'
import { FormAlert } from '#/components/FormAlert'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useGroupSubstitutionForm } from '../hooks/use-group-substitution-form'
import { useSaveGroupSubstitution } from '../hooks/use-save-group-substitution'
import { getLecturerChoices } from '../utils/lecturer-label'

interface GroupSubstitutionFormProps {
  organizationId: string
  groupId: string
  /** The substitution being edited, or none when adding */
  substitution?: GroupSubstitution
  lecturers: GroupLecturerOption[]
  timeZone: string
  onSaved: () => void
  onStopEditing: () => void
}

/** Covers a group for a day or a date range; the permanent lecturer stays as they are */
export function GroupSubstitutionForm({ organizationId, groupId, substitution, lecturers, timeZone, onSaved, onStopEditing }: GroupSubstitutionFormProps) {
  const form = useGroupSubstitutionForm({ substitution, defaultDay: todayIn(timeZone) })
  const saveSubstitution = useSaveGroupSubstitution({ organizationId, groupId })
  const ids = { lecturer: useId(), start: useId(), end: useId(), note: useId() }
  const { errors } = form.formState
  const isPending = saveSubstitution.isPending
  // Once it has started, only its end date can change
  const hasStarted = !!substitution && substitution.start_date <= todayIn(timeZone)
  const lecturerChoices = getLecturerChoices({ options: lecturers, kept: [substitution?.lecturer] })
  const fieldError = (fieldName: keyof GroupSubstitutionInput) => getFieldError<GroupSubstitutionInput>({ fieldName, formErrors: errors, backendError: saveSubstitution.error })

  const handleSubmit = form.handleSubmit((input: GroupSubstitutionInput) => {
    const params = substitution ? { kind: 'edit' as const, substitutionId: substitution.id, input } : { kind: 'add' as const, input }
    saveSubstitution.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="grid gap-4 border-t border-rule pt-5" noValidate onSubmit={handleSubmit}>
      <SelectField id={ids.lecturer} label="Substitute" disabled={isPending || hasStarted} error={fieldError('lecturer_id')} {...form.register('lecturer_id')}>
        <option value="">Choose a lecturer</option>
        {lecturerChoices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <AuthField id={ids.start} label="Start date" type="date" disabled={isPending || hasStarted} error={fieldError('start_date')} {...form.register('start_date')} />
        <AuthField id={ids.end} label="End date" type="date" disabled={isPending} error={fieldError('end_date')} {...form.register('end_date')} />
      </div>
      <AuthField id={ids.note} label="Note (optional)" autoComplete="off" disabled={isPending} error={fieldError('note')} {...form.register('note')} />

      {saveSubstitution.isError ? <FormAlert>{getErrorMessage(saveSubstitution.error)}</FormAlert> : null}

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {substitution ? (
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onStopEditing}>
            Stop editing
          </button>
        ) : null}
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {substitution ? 'Save substitution' : 'Add substitution'}
        </button>
      </div>
    </form>
  )
}
