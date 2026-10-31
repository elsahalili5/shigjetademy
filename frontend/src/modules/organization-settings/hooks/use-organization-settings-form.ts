import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { updateOrganizationSettingsSchema } from '@shigjetademy/shared/organization-settings'
import type { OrganizationSettings, UpdateOrganizationSettingsInput } from '@shigjetademy/shared/organization-settings'

export function useOrganizationSettingsForm(settings: OrganizationSettings) {
  const form = useForm<UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema),
    defaultValues: settings,
  })
  const dateFormat = useWatch({ control: form.control, name: 'date_format' })
  return { form, dateFormat }
}
