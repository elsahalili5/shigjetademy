import { useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { recordTopic } from '../utils/cache'

type PinInput = {
  topicId: string
  isPinned: boolean
}

/** A moderator pins a topic to the top of the list, or unpins it */
export function usePinDiscussion(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, isPinned }: PinInput) => discussionsApi.pin({ organizationId, topicId, isPinned }),
    onSuccess: (topic) => recordTopic({ queryClient, organizationId, topic }),
  })
}
