import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Material } from '@shigjetademy/shared/materials'
import { materialsApi } from '../api/materials-api'
import { forgetMaterial } from '../utils/cache'

type UseRemoveMaterialParams = {
  organizationId: string
  material: Material
}

/** Removes a material and its file, and takes it off its space's cached list */
export function useRemoveMaterial({ organizationId, material }: UseRemoveMaterialParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => materialsApi.remove({ organizationId, materialId: material.id }),
    onSuccess: () => forgetMaterial({ queryClient, organizationId, material }),
  })
}
