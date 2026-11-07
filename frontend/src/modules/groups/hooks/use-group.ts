import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseGroupParams = {
  organizationId: string
  groupId: string
}

/** One group, under the groups key, so saving any group loads it again */
export function useGroup({ organizationId, groupId }: UseGroupParams) {
  return useQuery({ queryKey: [...groupsQueryKey(organizationId), groupId, 'detail'], queryFn: () => groupsApi.get({ organizationId, groupId }) })
}
