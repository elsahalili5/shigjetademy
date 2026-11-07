import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GroupInput } from '@shigjetademy/shared/groups'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type SaveGroupParams = { kind: 'add'; input: GroupInput } | { kind: 'edit'; groupId: string; input: GroupInput }

/** Adds or edits a group; the list loads again, since its place and the counts may have changed */
export function useSaveGroup(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveGroupParams) => {
      switch (params.kind) {
        case 'add':
          return groupsApi.create({ organizationId, ...params.input })
        case 'edit':
          return groupsApi.update({ organizationId, groupId: params.groupId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) }),
  })
}
