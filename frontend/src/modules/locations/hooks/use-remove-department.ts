import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationDepartment } from '@shigjetademy/shared/location'
import { showErrorToast } from '#/lib/error-toast'
import { departmentsApi } from '../api/departments-api'
import { departmentsQueryKey } from './use-departments'

export function useRemoveDepartment(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: departmentsApi.remove,
    onError: (error) => showErrorToast(error),
    onSuccess: (_, { departmentId }) =>
      queryClient.setQueryData<OrganizationDepartment[]>(departmentsQueryKey(organizationId), (departments) =>
        departments?.filter((department) => department.id !== departmentId),
      ),
  })
}
