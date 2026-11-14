import { useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { recordTopic } from '../utils/cache'

type LockInput = {
  topicId: string
  isLocked: boolean
}

/** A moderator locks a topic so it takes no new replies, or unlocks it */
export function useLockDiscussion(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, isLocked }: LockInput) => discussionsApi.lock({ organizationId, topicId, isLocked }),
    onSuccess: (topic) => recordTopic({ queryClient, organizationId, topic }),
  })
}
