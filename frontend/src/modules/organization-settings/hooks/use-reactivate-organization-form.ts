import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { reactivateOrganizationSchema } from '@shigjetademy/shared/organization-settings'
import type { ReactivateOrganizationInput } from '@shigjetademy/shared/organization-settings'

export function useReactivateOrganizationForm() {
  return useForm<ReactivateOrganizationInput>({ resolver: zodResolver(reactivateOrganizationSchema), defaultValues: { password: '' } })
}
