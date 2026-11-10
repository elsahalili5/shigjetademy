import { useId } from 'react'
import type { ReactNode } from 'react'
import { useWatch } from 'react-hook-form'
import type { PlatformSettings, UpdatePlatformSettingsInput } from '@shigjetademy/shared/platform-settings'
import { FormAlert } from '#/components/FormAlert'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { FormSuccess } from '#/modules/auth/components/form-success'
import { toPlatformSettingsFormValues, usePlatformSettingsForm } from '../hooks/use-platform-settings-form'
import { useUpdatePlatformSettings } from '../hooks/use-update-platform-settings'

const MAINTENANCE_OPTIONS = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
] as const

interface PlatformSettingsFormProps {
  settings: PlatformSettings
}

/** The platform's name and logo, maintenance mode and the trial new organizations start with, saved together */
export function PlatformSettingsForm({ settings }: PlatformSettingsFormProps) {
  const form = usePlatformSettingsForm(settings)
  const updateSettings = useUpdatePlatformSettings()
  const { errors, isDirty } = form.formState
  const isPending = updateSettings.isPending
  const isMaintenanceOn = useWatch({ control: form.control, name: 'maintenance_mode' })
  const ids = { platformName: useId(), logoUrl: useId(), maintenanceMode: useId(), maintenanceMessage: useId(), defaultTrialDays: useId() }
  const fieldError = (fieldName: keyof UpdatePlatformSettingsInput) =>
    getFieldError<UpdatePlatformSettingsInput>({ fieldName, formErrors: errors, backendError: updateSettings.error })

  // Saved values become the new defaults, so the form is clean again until the next edit
  const handleSubmit = form.handleSubmit((input: UpdatePlatformSettingsInput) => {
    updateSettings.mutate(input, { onSuccess: (saved) => form.reset(toPlatformSettingsFormValues(saved)) })
  })

  return (
    <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
      <SectionCard title="General">
        <div className="grid gap-4 px-5 py-5">
          <Field label="Platform name" htmlFor={ids.platformName} error={fieldError('platform_name')}>
            <input id={ids.platformName} className={INPUT_CLASS} type="text" disabled={isPending} {...form.register('platform_name')} />
          </Field>
          <Field label="Logo URL" htmlFor={ids.logoUrl} hint="Optional" error={fieldError('logo_url')}>
            <input id={ids.logoUrl} className={INPUT_CLASS} type="text" placeholder="https://school.org/logo.png" disabled={isPending} {...form.register('logo_url')} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Platform operations">
        <div className="grid gap-4 px-5 py-5">
          <SelectField id={ids.maintenanceMode} label="Maintenance mode" disabled={isPending} error={fieldError('maintenance_mode')} {...form.register('maintenance_mode', { setValueAs: (value: string) => value === 'true' })}>
            {MAINTENANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          {isMaintenanceOn ? (
            <Field label="Maintenance message" htmlFor={ids.maintenanceMessage} hint="Shown to everyone but platform admins" error={fieldError('maintenance_message')}>
              <input id={ids.maintenanceMessage} className={INPUT_CLASS} type="text" disabled={isPending} {...form.register('maintenance_message')} />
            </Field>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Organization defaults">
        <div className="grid gap-4 px-5 py-5">
          <Field label="Default trial length (days)" htmlFor={ids.defaultTrialDays} hint="0 means no trial" error={fieldError('default_trial_days')}>
            <input
              id={ids.defaultTrialDays}
              className={INPUT_CLASS}
              type="number"
              min={0}
              step={1}
              disabled={isPending}
              {...form.register('default_trial_days', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </SectionCard>

      {updateSettings.isError ? <FormAlert>{getErrorMessage(updateSettings.error)}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={isPending || !isDirty}>
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
        {updateSettings.isSuccess && !isDirty ? <FormSuccess>The platform settings are saved.</FormSuccess> : null}
      </div>
    </form>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const errorId = `${htmlFor}-error`
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-3">{hint}</span> : null}
      </label>
      {children}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
