import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { lecturerSchema } from '@shigjetademy/shared/lecturers'
import type { Lecturer, LecturerInput } from '@shigjetademy/shared/lecturers'

/** The lecturer being edited, or none when adding */
export function useLecturerForm(lecturer?: Lecturer) {
  return useForm<LecturerInput>({
    resolver: zodResolver(lecturerSchema),
    defaultValues: {
      first_name: lecturer?.first_name ?? '',
      last_name: lecturer?.last_name ?? '',
      email: lecturer?.email ?? '',
      phone: lecturer?.phone ?? '',
      subjects: lecturer?.subjects ?? [],
      employment_type: lecturer?.employment_type ?? 'FULL_TIME',
      started_on: lecturer?.started_on ?? '',
      notes: lecturer?.notes ?? '',
      department_id: lecturer?.department?.id ?? null,
      location_ids: lecturer?.locations.map((location) => location.id) ?? [],
    },
  })
}
