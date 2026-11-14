import { useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { recordTopic } from '../utils/cache'

/** Removes a topic (the row stays, shown as removed) and shows it so in the cached list and detail */
export function useRemoveDiscussion(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topicId: string) => discussionsApi.remove({ organizationId, topicId }),
    onSuccess: (topic) => recordTopic({ queryClient, organizationId, topic }),
  })
}
