import type { SpaceRef } from '@shigjetademy/shared/spaces'

type ListKeyParams = {
  organizationId: string
  space: Pick<SpaceRef, 'kind' | 'id'>
}

export const materialQueryKeys = {
  spaces: (organizationId: string) => ['organizations', organizationId, 'materials', 'spaces'] as const,
  list: ({ organizationId, space }: ListKeyParams) => ['organizations', organizationId, 'materials', 'list', space.kind, space.id] as const,
}
