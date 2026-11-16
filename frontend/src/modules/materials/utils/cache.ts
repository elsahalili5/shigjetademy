import type { QueryClient } from '@tanstack/react-query'
import type { Material } from '@shigjetademy/shared/materials'
import { materialQueryKeys } from './query-keys'

type RecordMaterialParams = {
  queryClient: QueryClient
  organizationId: string
  material: Material
}

/** Puts a material the member just shared or changed into its space's list: in place when it is there, a new one at the top, so nothing is fetched again */
export const recordMaterial = ({ queryClient, organizationId, material }: RecordMaterialParams) => {
  queryClient.setQueryData<Material[]>(materialQueryKeys.list({ organizationId, space: material.space }), (materials = []) =>
    materials.some((item) => item.id === material.id) ? materials.map((item) => (item.id === material.id ? material : item)) : [material, ...materials],
  )
}

/** Takes a material the member just removed off its space's list */
export const forgetMaterial = ({ queryClient, organizationId, material }: RecordMaterialParams) => {
  queryClient.setQueryData<Material[]>(materialQueryKeys.list({ organizationId, space: material.space }), (materials) => materials?.filter((item) => item.id !== material.id))
}
