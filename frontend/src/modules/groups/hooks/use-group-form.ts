import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { groupSchema } from '@shigjetademy/shared/groups'
import type { Group, GroupInput } from '@shigjetademy/shared/groups'

type UseGroupFormParams = {
  /** The group being edited, or none when adding */
  group?: Group
  /** Where a new group starts */
  defaultYearId: string
}

export function useGroupForm({ group, defaultYearId }: UseGroupFormParams) {
  return useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      course_id: group?.course.id ?? '',
      name: group?.name ?? '',
      academic_year_id: group?.academic_year.id ?? defaultYearId,
      academic_term_id: group?.academic_term?.id ?? null,
      location_id: group?.location?.id ?? null,
      capacity: group?.capacity ?? null,
    },
  })
}
