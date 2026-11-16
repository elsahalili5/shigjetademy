import { useMutation } from '@tanstack/react-query'
import { materialsApi } from '../api/materials-api'

/** Fetches a material's file with the member's token; the component saves it */
export function useDownloadMaterial(organizationId: string) {
  return useMutation({
    mutationFn: (materialId: string) => materialsApi.download({ organizationId, materialId }),
  })
}
