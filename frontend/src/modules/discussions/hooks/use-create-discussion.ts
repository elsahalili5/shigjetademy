import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateDiscussionTopicInput } from '@shigjetademy/shared/discussions'
import { discussionsApi } from '../api/discussions-api'
import { recordTopic } from '../utils/cache'

/** Starts a topic and puts it in the cached list */
export function useCreateDiscussion(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDiscussionTopicInput) => discussionsApi.create({ organizationId, ...input }),
    onSuccess: (topic) => recordTopic({ queryClient, organizationId, topic }),
  })
}
