import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { deactivateOrganizationSchema } from '@shigjetademy/shared/organization-settings'
import type { DeactivateOrganizationInput } from '@shigjetademy/shared/organization-settings'

/** The typed name must match the organization's, letter for letter, before anything is sent */
export function useDeactivateOrganizationForm(organizationName: string) {
  const schema = deactivateOrganizationSchema.refine((input) => input.confirm_name === organizationName, {
    path: ['confirm_name'],
    message: `Type ${organizationName} exactly as it is shown.`,
  })
  return useForm<DeactivateOrganizationInput>({ resolver: zodResolver(schema), defaultValues: { confirm_name: '', password: '' } })
}
