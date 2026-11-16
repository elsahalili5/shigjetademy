import { useMutation, useQueryClient } from '@tanstack/react-query'
import { materialsApi } from '../api/materials-api'
import { recordMaterial } from '../utils/cache'
import type { MaterialRequest } from '../utils/material-form'

/** Uploads a file or shares a link or note, and puts it at the top of its space's cached list */
export function useShareMaterial(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: MaterialRequest) => {
      switch (request.kind) {
        case 'upload':
          return materialsApi.upload({ organizationId, fields: request.fields, file: request.file })
        case 'create':
          return materialsApi.create({ organizationId, ...request.input })
        default: {
          const unknown: never = request
          throw new Error(`Unknown material request: ${String(unknown)}`)
        }
      }
    },
    onSuccess: (material) => recordMaterial({ queryClient, organizationId, material }),
  })
}
