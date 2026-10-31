import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { showErrorToast } from '#/lib/error-toast'
import { locationsApi } from '../api/locations-api'
import { withoutDepartmentLocation } from '../utils/department-cache'
import { withoutLocation } from '../utils/location-cache'
import { departmentsQueryKey } from './use-departments'
import { locationsQueryKey } from './use-locations'

// Its departments stay in the cache too, without a location, as they do on the server
export function useRemoveLocation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: locationsApi.remove,
    onError: (error) => showErrorToast(error),
    onSuccess: (_, { locationId, newMainId }) => {
      queryClient.setQueryData<OrganizationLocation[]>(locationsQueryKey(organizationId), (locations) =>
        locations ? withoutLocation({ locations, locationId, newMainId }) : locations,
      )
      queryClient.setQueryData<OrganizationDepartment[]>(departmentsQueryKey(organizationId), (departments) =>
        departments ? withoutDepartmentLocation({ departments, locationId }) : departments,
      )
    },
  })
}
