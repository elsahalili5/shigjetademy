import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { updateOrganizationProfileSchema } from '@shigjetademy/shared/organization'
import type { OrganizationProfile, UpdateOrganizationProfileInput } from '@shigjetademy/shared/organization'
import { toProfileFormValues } from '../utils/profile-form-values'

export function useOrganizationProfileForm(profile: OrganizationProfile) {
  const form = useForm<UpdateOrganizationProfileInput>({
    resolver: zodResolver(updateOrganizationProfileSchema),
    defaultValues: toProfileFormValues(profile),
  })
  // "Choose a range" is no size at all
  const sizeField = form.register('size', { setValueAs: (value: string) => (value === '' ? undefined : value) })
  return { form, sizeField }
}
