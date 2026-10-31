import { useId } from 'react'
import { DATE_FORMATS, TIME_ZONES, WEEK_STARTS } from '@shigjetademy/shared/organization-settings'
import type { OrganizationSettings, UpdateOrganizationSettingsInput } from '@shigjetademy/shared/organization-settings'
import { FormAlert } from '#/components/FormAlert'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { formatOrganizationDate } from '#/lib/format'
import { FormSuccess } from '#/modules/auth/components/form-success'
import { useOrganizationSettingsForm } from '../hooks/use-organization-settings-form'
import { useUpdateOrganizationSettings } from '../hooks/use-update-organization-settings'
import { WEEK_START_LABELS } from '../utils/labels'
import { formatTimeZone } from '../utils/time-zones'

// A fixed day keeps the preview from changing with today's date
const EXAMPLE_DATE = '2026-10-31T12:00:00.000Z'

interface PreferencesFormProps {
  organizationId: string
  settings: OrganizationSettings
}

/** Time zone, first day of the week and date format, saved together */
export function PreferencesForm({ organizationId, settings }: PreferencesFormProps) {
  const settingsForm = useOrganizationSettingsForm(settings)
  const updateSettings = useUpdateOrganizationSettings(organizationId)
  const { form } = settingsForm
  const { errors, isDirty } = form.formState
  const isPending = updateSettings.isPending
  const ids = { timeZone: useId(), weekStart: useId(), dateFormat: useId() }
  const fieldError = (fieldName: keyof UpdateOrganizationSettingsInput) =>
    getFieldError<UpdateOrganizationSettingsInput>({ fieldName, formErrors: errors, backendError: updateSettings.error })

  // Saved values become the new defaults, so the form is clean again until the next edit
  const handleSubmit = form.handleSubmit((input: UpdateOrganizationSettingsInput) => {
    updateSettings.mutate({ organizationId, ...input }, { onSuccess: (saved) => form.reset(saved) })
  })

  return (
    <SectionCard title="General preferences">
      <form className="grid gap-4 px-5 py-5" noValidate onSubmit={handleSubmit}>
        <SelectField id={ids.timeZone} label="Time zone" disabled={isPending} error={fieldError('time_zone')} {...form.register('time_zone')}>
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {formatTimeZone(zone)}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <SelectField id={ids.weekStart} label="First day of the week" disabled={isPending} error={fieldError('week_start')} {...form.register('week_start')}>
            {WEEK_STARTS.map((weekStart) => (
              <option key={weekStart} value={weekStart}>
                {WEEK_START_LABELS[weekStart]}
              </option>
            ))}
          </SelectField>
          <SelectField id={ids.dateFormat} label="Date format" disabled={isPending} error={fieldError('date_format')} {...form.register('date_format')}>
            {DATE_FORMATS.map((dateFormat) => (
              <option key={dateFormat} value={dateFormat}>
                {formatOrganizationDate({ iso: EXAMPLE_DATE, dateFormat })}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="text-[0.95rem] text-ink-2">Dates look like {formatOrganizationDate({ iso: EXAMPLE_DATE, dateFormat: settingsForm.dateFormat })}</p>

        {updateSettings.isError ? <FormAlert>{getErrorMessage(updateSettings.error)}</FormAlert> : null}

        <div className="flex flex-wrap items-center gap-4">
          <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={isPending || !isDirty}>
            {isPending ? 'Saving…' : 'Save preferences'}
          </button>
          {updateSettings.isSuccess && !isDirty ? <FormSuccess>The preferences are saved.</FormSuccess> : null}
        </div>
      </form>
    </SectionCard>
  )
}
