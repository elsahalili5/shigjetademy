import { useQuery } from '@tanstack/react-query'
import type { SpaceRef } from '@shigjetademy/shared/spaces'
import { materialsApi } from '../api/materials-api'
import { materialQueryKeys } from '../utils/query-keys'

type UseMaterialsParams = {
  organizationId: string
  space: Pick<SpaceRef, 'kind' | 'id'>
}

/** The materials shared with one group or course, newest first */
export function useMaterials({ organizationId, space }: UseMaterialsParams) {
  return useQuery({
    queryKey: materialQueryKeys.list({ organizationId, space }),
    queryFn: () => materialsApi.list({ organizationId, space_kind: space.kind, space_id: space.id }),
  })
}
