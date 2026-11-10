import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { updatePlatformSettingsSchema } from '@shigjetademy/shared/platform-settings'
import type { PlatformSettings, UpdatePlatformSettingsInput } from '@shigjetademy/shared/platform-settings'

/** The saved settings as the form's own values: nulls become empty strings for the text inputs */
export const toPlatformSettingsFormValues = (settings: PlatformSettings): UpdatePlatformSettingsInput => ({
  platform_name: settings.platform_name,
  logo_url: settings.logo_url ?? '',
  maintenance_mode: settings.maintenance_mode,
  maintenance_message: settings.maintenance_message ?? '',
  default_trial_days: settings.default_trial_days,
})

export function usePlatformSettingsForm(settings: PlatformSettings) {
  return useForm<UpdatePlatformSettingsInput>({
    resolver: zodResolver(updatePlatformSettingsSchema),
    defaultValues: toPlatformSettingsFormValues(settings),
  })
}
