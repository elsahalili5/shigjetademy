import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateMaterialInput } from '@shigjetademy/shared/materials'
import { materialsApi } from '../api/materials-api'
import { recordMaterial } from '../utils/cache'

type UseUpdateMaterialParams = {
  organizationId: string
  materialId: string
}

/** Saves a material's title, description and section, and changes it in its space's cached list */
export function useUpdateMaterial({ organizationId, materialId }: UseUpdateMaterialParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMaterialInput) => materialsApi.update({ organizationId, materialId, ...input }),
    onSuccess: (material) => recordMaterial({ queryClient, organizationId, material }),
  })
}
