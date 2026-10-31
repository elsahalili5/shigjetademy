import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { departmentSchema } from '@shigjetademy/shared/location'
import type { DepartmentInput, OrganizationDepartment } from '@shigjetademy/shared/location'

export function useDepartmentForm(department?: OrganizationDepartment) {
  const form = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name ?? '', description: department?.description ?? '', location_id: department?.location_id ?? null },
  })
  // "No location" is sent as null
  const locationField = form.register('location_id', { setValueAs: (value: string | null) => value || null })
  return { form, locationField }
}
