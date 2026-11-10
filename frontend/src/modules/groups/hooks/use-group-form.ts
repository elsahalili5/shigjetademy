import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { groupSchema, newGroupSchema } from '@shigjetademy/shared/groups'
import type { Group, GroupInput } from '@shigjetademy/shared/groups'
import { getPlannedLecturer } from '../utils/lecturer-label'
import { NEW_SCHEDULE_ENTRY } from '../utils/new-schedule-entry'

type UseGroupFormParams = {
  /** The group being edited, or none when adding */
  group?: Group
  /** Where a new group starts */
  defaultYearId: string
}

export function useGroupForm({ group, defaultYearId }: UseGroupFormParams) {
  // Only a group that never had a schedule may save without one
  const isScheduleOptional = !!group && group.schedule.length === 0
  return useForm<GroupInput>({
    resolver: zodResolver(isScheduleOptional ? groupSchema : newGroupSchema),
    defaultValues: {
      course_id: group?.course.id ?? '',
      name: group?.name ?? '',
      academic_year_id: group?.academic_year.id ?? defaultYearId,
      academic_term_id: group?.academic_term?.id ?? null,
      room_id: group?.room?.id ?? null,
      capacity: group?.capacity ?? null,
      lecturer_id: (group && getPlannedLecturer(group)?.id) ?? null,
      lecturer_effective_from: group?.lecturer_change?.start_date ?? null,
      schedule: group ? group.schedule : [{ ...NEW_SCHEDULE_ENTRY }],
    },
  })
}
