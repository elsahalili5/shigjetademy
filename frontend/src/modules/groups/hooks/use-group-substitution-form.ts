import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { groupSubstitutionSchema } from '@shigjetademy/shared/groups'
import type { GroupSubstitution, GroupSubstitutionInput } from '@shigjetademy/shared/groups'

type UseGroupSubstitutionFormParams = {
  /** The substitution being edited, or none when adding */
  substitution?: GroupSubstitution
  /** The day a new substitution starts and ends on */
  defaultDay: string
}

export function useGroupSubstitutionForm({ substitution, defaultDay }: UseGroupSubstitutionFormParams) {
  return useForm<GroupSubstitutionInput>({
    resolver: zodResolver(groupSubstitutionSchema),
    defaultValues: {
      lecturer_id: substitution?.lecturer.id ?? '',
      start_date: substitution?.start_date ?? defaultDay,
      end_date: substitution?.end_date ?? defaultDay,
      note: substitution?.note ?? '',
    },
  })
}
