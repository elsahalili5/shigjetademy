import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateDiscussionTopicInput } from '@shigjetademy/shared/discussions'
import { discussionsApi } from '../api/discussions-api'
import { recordTopic } from '../utils/cache'

type UseUpdateDiscussionParams = {
  organizationId: string
  topicId: string
}

/** Saves a change to the member's own topic and shows it changed in the cached list and detail */
export function useUpdateDiscussion({ organizationId, topicId }: UseUpdateDiscussionParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateDiscussionTopicInput) => discussionsApi.update({ organizationId, topicId, ...input }),
    onSuccess: (topic) => recordTopic({ queryClient, organizationId, topic }),
  })
}
