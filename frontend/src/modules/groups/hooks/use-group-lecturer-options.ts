import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '../api/groups-api'
import { groupsQueryKey } from './use-groups'

type UseGroupLecturerOptionsParams = {
  organizationId: string
  /** False for someone who can't change groups, who never needs them */
  isEnabled?: boolean
}

/** The active lecturers the group and substitution forms offer */
export function useGroupLecturerOptions({ organizationId, isEnabled = true }: UseGroupLecturerOptionsParams) {
  return useQuery({ queryKey: [...groupsQueryKey(organizationId), 'lecturer-options'], queryFn: () => groupsApi.lecturerOptions(organizationId), enabled: isEnabled })
}
