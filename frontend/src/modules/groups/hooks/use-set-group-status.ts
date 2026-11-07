import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GroupStatus } from '@shigjetademy/shared/groups'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type SetGroupStatusParams = {
  groupId: string
  status: GroupStatus
}

/** Archives a group or restores it; the group and its history stay either way */
export function useSetGroupStatus(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, status }: SetGroupStatusParams) => {
      switch (status) {
        case 'ARCHIVED':
          return groupsApi.archive({ organizationId, groupId })
        case 'ACTIVE':
          return groupsApi.restore({ organizationId, groupId })
        default: {
          const unknown: never = status
          throw new Error(`Unknown group status: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsQueryKey(organizationId) }),
  })
}
