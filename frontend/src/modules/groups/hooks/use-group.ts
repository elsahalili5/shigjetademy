import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseGroupParams = {
  organizationId: string
  groupId: string
  /** False while no group is chosen yet, like before a schedule cell is clicked */
  isEnabled?: boolean
}

/** One group, under the groups key, so saving any group loads it again */
export function useGroup({ organizationId, groupId, isEnabled = true }: UseGroupParams) {
  return useQuery({ queryKey: [...groupsQueryKey(organizationId), groupId, 'detail'], queryFn: () => groupsApi.get({ organizationId, groupId }), enabled: isEnabled })
}
