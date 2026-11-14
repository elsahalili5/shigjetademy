import { useQuery } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { discussionQueryKeys } from '../utils/query-keys'

/** The groups and courses the member reads; they can start a topic in the ones that are not archived */
export function useDiscussionSpaces(organizationId: string) {
  return useQuery({
    queryKey: discussionQueryKeys.spaces(organizationId),
    queryFn: () => discussionsApi.listSpaces(organizationId),
  })
}
