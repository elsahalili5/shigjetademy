import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { GUARDIAN_RELATIONSHIPS, guardianSchema } from '@shigjetademy/shared/guardians'
import type { GuardianInput, StudentGuardian } from '@shigjetademy/shared/guardians'

// The relationship select starts on its "Choose" option, which the server's schema never sees
const guardianFormSchema = guardianSchema.extend({
  relationship: z.string().pipe(z.enum(GUARDIAN_RELATIONSHIPS, 'Choose how they’re related.')),
})

type GuardianFormValues = z.input<typeof guardianFormSchema>

/** The guardian being edited, or none when adding */
export function useGuardianForm(guardian?: StudentGuardian) {
  return useForm<GuardianFormValues, unknown, GuardianInput>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: {
      first_name: guardian?.first_name ?? '',
      last_name: guardian?.last_name ?? '',
      email: guardian?.email ?? '',
      phone: guardian?.phone ?? '',
      relationship: guardian?.relationship ?? '',
    },
  })
}
