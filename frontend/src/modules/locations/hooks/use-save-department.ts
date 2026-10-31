import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DepartmentInput, OrganizationDepartment } from '@shigjetademy/shared/location'
import { departmentsApi } from '../api/departments-api'
import { withSavedDepartment } from '../utils/department-cache'
import { departmentsQueryKey } from './use-departments'

type SaveDepartmentParams = {
  /** Absent when adding a new department */
  departmentId?: string
  input: DepartmentInput
}

// Adds or edits a department; the saved one goes into the cached list, so it shows without a refetch
export function useSaveDepartment(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ departmentId, input }: SaveDepartmentParams) =>
      departmentId ? departmentsApi.update({ organizationId, departmentId, ...input }) : departmentsApi.create({ organizationId, ...input }),
    onSuccess: (saved) =>
      queryClient.setQueryData<OrganizationDepartment[]>(departmentsQueryKey(organizationId), (departments) => withSavedDepartment({ departments: departments ?? [], saved })),
  })
}
