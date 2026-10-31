import type { ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { COUNTRIES, createOrganizationSchema, getDefaultCurrency } from '@shigjetademy/shared/organization'
import type { CountryCode, CreateOrganizationInput } from '@shigjetademy/shared/organization'

const DEFAULT_COUNTRY: CountryCode = 'XK'

type UseCreateOrganizationFormParams = {
  onSubmit: (input: CreateOrganizationInput) => void
}

export const useCreateOrganizationForm = ({ onSubmit }: UseCreateOrganizationFormParams) => {
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      country: DEFAULT_COUNTRY,
      currency: getDefaultCurrency(DEFAULT_COUNTRY),
    },
  })

  // A new country brings its own currency; the owner can still pick another one after
  const countryField = form.register('country', {
    onChange: (event: ChangeEvent<HTMLSelectElement>) => {
      const country = COUNTRIES.find((entry) => entry.code === event.target.value)
      if (country) form.setValue('currency', country.currency)
    },
  })

  const sizeField = form.register('size', { setValueAs: (value: string) => (value === '' ? undefined : value) })

  const handleSubmit = form.handleSubmit(onSubmit)

  return { form, countryField, sizeField, handleSubmit }
}
