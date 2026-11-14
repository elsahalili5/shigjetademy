import { useQuery } from '@tanstack/react-query'
import { announcementsApi } from '../api/announcements-api'
import { announcementQueryKeys } from '../utils/query-keys'

type UseAnnouncementAudiencesParams = {
  organizationId: string
  isEnabled: boolean
}

/** What the member may address an announcement to: everything for staff, the groups and courses they teach for a lecturer */
export function useAnnouncementAudiences({ organizationId, isEnabled }: UseAnnouncementAudiencesParams) {
  return useQuery({
    queryKey: announcementQueryKeys.audiences(organizationId),
    queryFn: () => announcementsApi.getAudienceOptions(organizationId),
    enabled: isEnabled,
  })
}
