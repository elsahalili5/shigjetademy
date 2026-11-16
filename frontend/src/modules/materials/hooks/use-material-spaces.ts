import { useQuery } from '@tanstack/react-query'
import { materialsApi } from '../api/materials-api'
import { materialQueryKeys } from '../utils/query-keys'

/** The groups and courses the member reads materials in; can_post marks where they may share */
export function useMaterialSpaces(organizationId: string) {
  return useQuery({
    queryKey: materialQueryKeys.spaces(organizationId),
    queryFn: () => materialsApi.listSpaces(organizationId),
  })
}
